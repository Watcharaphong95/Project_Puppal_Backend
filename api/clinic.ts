import express from "express";
import { conn } from "../dbconnect";
import { db } from "../firebaseconnect";
import mysql from "mysql";
import { ClinicPost } from "../model/clinicPost";
import { ClinicSearch } from "../model/clinicSearchPost";
import { getDistance } from "geolib";
import { ClinicSlotGet } from "../model/clinicSlotGet";
import { ClinicSlotPost } from "../model/clinicSlotPost";
import moment from "moment-timezone";
import { FcmTokenPost } from "../model/fcmTokenPost";

export const router = express.Router();

router.get("/", async (req, res) => {
  let sql = "SELECT * FROM clinic";
  conn.query(sql, (err, result) => {
    if (err) throw err;
    res.status(200).json(result);
  });
});

router.post("/search", async (req, res) => {
  let search: ClinicSearch = req.body;
  let sqlGeneral = "SELECT lat, lng FROM general WHERE user_email = ?";
  sqlGeneral = mysql.format(sqlGeneral, [search.email]);
  conn.query(sqlGeneral, (err, result) => {
    if (err) throw err;
    const generalLat = parseFloat(result[0].lat);
    const generalLng = parseFloat(result[0].lng);

    let sql = "SELECT * FROM clinic WHERE user_email != ? AND name LIKE ?";
    sql = mysql.format(sql, [search.email, `%${search.word}%`]);
    conn.query(sql, async (err, result) => {
      if (err) throw err;
      const clinicsWithDistance = result.map((clinic: any) => {
        const clinicLat = parseFloat(clinic.lat);
        const clinicLng = parseFloat(clinic.lng);

        const distanceMeters = getDistance(
          { latitude: generalLat, longitude: generalLng },
          { latitude: clinicLat, longitude: clinicLng }
        );

        return {
          ...clinic,
          distanceKm: distanceMeters / 1000,
        };
      });

      clinicsWithDistance.sort((a: any, b: any) => a.distanceKm - b.distanceKm);

      const formattedClinics = clinicsWithDistance.map((clinic: any) => ({
        ...clinic,
        distance: clinic.distanceKm.toFixed(2) + " km",
      }));

      interface ReserveData {
        clinicEmail: string;
        date: string;
      }
      const inputMoment = moment.tz(search.date, "Asia/Bangkok");
      const dateString = inputMoment.format("YYYY-MM-DD");

      const start = `${dateString} 00:00:00.000`;
      const end = `${dateString} 23:59:59.999`;

      try {
        // Step 1: Query Firestore once for all reservations on the date
        const snapshot = await db
          .collection("reserve")
          .select("clinicEmail", "date", "generalEmail")
          .where("generalEmail", "==", search.email)
          .where("date", ">=", start)
          .where("date", "<=", end)
          .get();

        // Step 2: Build special clinics set (based on clinicEmail != search.email)
        const specialClinics = new Set<string>();
        snapshot.docs.forEach((doc) => {
          const data = doc.data() as ReserveData;
          if (data.clinicEmail && data.clinicEmail !== search.email) {
            specialClinics.add(data.clinicEmail);
          }
        });

        // Step 3: Build a map from clinicEmail to counts per time slot
        // { [clinicEmail]: { [time]: count } }
        const clinicTimeCounts: Record<string, Record<string, number>> = {};

        snapshot.docs.forEach((doc) => {
          const data = doc.data() as ReserveData;
          if (!clinicTimeCounts[data.clinicEmail]) {
            clinicTimeCounts[data.clinicEmail] = {};
          }
          const time = data.date.substring(11, 16);
          clinicTimeCounts[data.clinicEmail][time] =
            (clinicTimeCounts[data.clinicEmail][time] || 0) + 1;
        });

        // Step 4: Map over clinics, check full status from clinicTimeCounts without new queries
        const finalClinics = formattedClinics.map((clinic: any) => {
          const clinicEmail = clinic.user_email;
          const numPerTime = clinic.numPerTime;

          const timeCounts = clinicTimeCounts[clinicEmail] || {};

          const allTimeSlots = generateTimeSlots(clinic.open, clinic.close, 30);

          const filledSlots = allTimeSlots.filter(
            (slot) => (timeCounts[slot] || 0) >= numPerTime
          );

          const isFull = filledSlots.length === allTimeSlots.length;

          return {
            ...clinic,
            special: specialClinics.has(clinicEmail) ? 1 : 0,
            full: isFull ? 1 : 0,
          };
        });

        res.status(200).json(finalClinics);
      } catch (error) {
        console.error("🔥 Error fetching data:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });
  });
});

router.get("/data/:email", (req, res) => {
  let email = req.params.email;
  let sql = "SELECT * FROM clinic WHERE user_email = ?";
  sql = mysql.format(sql, [email]);
  conn.query(sql, (err, result) => {
    if (err) throw err;
    if (result.length > 0) {
      res.status(200).json(result[0]);
    } else {
      res.status(404).json({ message: "User not found" });
    }
  });
});

router.get("/name/:email", (req, res) => {
  let email = req.params.email;
  let sql = "SELECT name, image FROM clinic WHERE user_email = ?";
  sql = mysql.format(sql, [email]);
  conn.query(sql, (err, result) => {
    if (err) throw err;
    if (result.length > 0) {
      res.status(200).json(result[0]);
    } else {
      res.status(404).json({ message: "User not found" });
    }
  });
});

router.get("/slotAll/:email", (req, res) => {
  let email = req.params.email;
  let sql = "SELECT open, close, numPerTime FROM clinic WHERE user_email = ?";
  sql = mysql.format(sql, [email]);
  conn.query(sql, (err, result) => {
    if (err) throw err;
    if (result.length > 0) {
      let clinic: ClinicSlotGet = result[0];
      const timeSlot = generateTimeSlots(clinic.open, clinic.close, 30);
      res.status(200).json({ ...clinic, timeSlots: timeSlot });
    } else {
      res.status(404).json({ message: "User not found" });
    }
  });
});

router.post("/slot", async (req, res) => {
  let input: ClinicSlotPost = req.body;

  interface ReserveData {
    clinicEmail: string;
    date: string;
  }

  const inputMoment = moment.tz(input.date, "Asia/Bangkok");
  const dateString = inputMoment.format("YYYY-MM-DD");
  const todayDateString = moment().tz("Asia/Bangkok").format("YYYY-MM-DD");
  const nowTime = moment().tz("Asia/Bangkok").format("HH:mm");

  const start = `${dateString} 00:00:00.000`;
  const end = `${dateString} 23:59:59.999`;

  try {
    const snapshot = await db
      .collection("reserve")
      .select("clinicEmail", "date")
      .where("clinicEmail", "==", input.email)
      .where("status", "!=", 0)
      .where("date", ">=", start)
      .where("date", "<=", end)
      .get();

    let sql = "SELECT open, close, numPerTime FROM clinic WHERE user_email = ?";
    sql = mysql.format(sql, [input.email]);

    conn.query(sql, (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Database error" });
      }

      if (result.length === 0) {
        return res.status(404).json({ error: "Clinic not found" });
      }

      const clinic: ClinicSlotGet = result[0];
      const numPerTime = clinic.numPerTime;

      const reserves = snapshot.docs.map((doc) => {
        const data = doc.data() as ReserveData;
        return { id: doc.id, ...data };
      });

      const countsByTime: Record<string, number> = {};

      reserves.forEach((r) => {
        const time = r.date.substring(11, 16); // "HH:mm"
        countsByTime[time] = (countsByTime[time] || 0) + 1;
      });

      // Step 1: Get slots that reached numPerTime
      let fullSlots = Object.entries(countsByTime)
        .filter(([_, count]) => count >= numPerTime)
        .map(([time]) => time);

      // Step 2: Also disable past slots if today
      if (dateString === todayDateString) {
        const clinicOpenTime = moment(clinic.open, "HH:mm");
        const clinicCloseTime = moment(clinic.close, "HH:mm");

        let current = clinicOpenTime.clone();
        while (current.isBefore(clinicCloseTime)) {
          const slot = current.format("HH:mm");

          if (slot < nowTime && !fullSlots.includes(slot)) {
            fullSlots.push(slot); // mark past time as full/disabled
          }

          current.add(30, "minutes"); // Adjust gap if needed
        }
      }

      res.status(200).json({ ...clinic, timeSlots: fullSlots });
    });
  } catch (error) {
    console.error("🔥 Error fetching data:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", (req, res) => {
  let clinic: ClinicPost = req.body;
  let sql =
    "INSERT INTO clinic (user_email, name, phone, address, lat, lng, image, open, close, numPerTime) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
  sql = mysql.format(sql, [
    clinic.user_email,
    clinic.name,
    clinic.phone,
    clinic.address,
    clinic.lat,
    clinic.lng,
    clinic.image,
    clinic.open,
    clinic.close,
    clinic.numPerTime,
  ]);

  conn.query(sql, (err, result) => {
    if (err) throw err;
    res.status(201).json({ message: "insert success" });
  });
});

function generateTimeSlots(
  open: string,
  close: string,
  gapMinutes: number,
  filledSlots: string[] = []
): string[] {
  const slots: string[] = [];

  const [openHour, openMinute] = open.split(":").map(Number);
  const [closeHour, closeMinute] = close.split(":").map(Number);

  let current = new Date(0, 0, 0, openHour, openMinute);
  const end = new Date(0, 0, 0, closeHour, closeMinute);

  const breakStart = new Date(0, 0, 0, 12, 0);
  const breakEnd = new Date(0, 0, 0, 13, 0);

  while (current < end) {
    if (current >= breakStart && current < breakEnd) {
      current = breakEnd;
      continue;
    }

    const timeStr = current.toTimeString().slice(0, 5); // "HH:MM"

    if (!filledSlots.includes(timeStr)) {
      slots.push(timeStr);
    }

    current = new Date(current.getTime() + gapMinutes * 60000);
  }

  return slots;
}
