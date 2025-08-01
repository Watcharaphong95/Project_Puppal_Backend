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
import { ClinicEditProfilePost } from "../model/clinicEditProfilePost";

export const router = express.Router();

router.get("/", async (req, res) => {
  let sql = "SELECT * FROM clinic";
  conn.query(sql, (err, result) => {
    if (err) throw err;
    res.status(200).json(result);
  });
});

router.get("/profile/:email", async (req, res) => {
  let email = req.params.email;
  let sql = "SELECT * FROM clinic WHERE user_email = ? ";
  conn.query(sql,[email], (err, result) => {
    if (err) throw err;
    res.status(200).json(result);
  });
});

router.put("/update/:email", (req, res) => {
  const email = req.params.email;
  const data: ClinicEditProfilePost = req.body;

  const sql = `
    UPDATE clinic
    SET name=?, phone=?, address=?, lat=?, lng=?, image=?, numPerTime=?
    WHERE user_email=?
  `;

  console.log(`Updating schedule with ID: ${email}`, data);

  conn.query(
    sql,
    [data.name, data.phone, data.address, data.lat, data.lng, data.image, data.numPerTime, email],
    (err, result) => {
      if (err) {
        console.error("❌ Update error:", err);
        return res.status(500).json({ error: "Database update failed" });
      }
      res.status(200).json({ message: "✅ Schedule updated", result });
    }
  );
});


router.get("/allSpecial", async (req, res) => {
  let sql = "SELECT * FROM special";
  conn.query(sql, (err, result) => {
    if (err) throw err;
    res.status(200).json(result);
  });
});

router.post("/search", async (req, res) => {
  const search: ClinicSearch = req.body;
  
  try {
    // 1. Get user location with promise
    const [generalResult] = await new Promise<any>((resolve, reject) => {
      const sqlGeneral = mysql.format("SELECT lat, lng FROM general WHERE user_email = ?", [search.email]);
      conn.query(sqlGeneral, (err: any, result: any) => {
        if (err) reject(err);
        else resolve([result]);
      });
    });

    if (!generalResult.length) {
      res.status(404).json({ error: "User not found" });
    }

    const generalLat = parseFloat(generalResult[0].lat);
    const generalLng = parseFloat(generalResult[0].lng);

    // 2. Get all clinic data in one optimized query
    const clinicResults = await new Promise<any>((resolve, reject) => {
      const sql = mysql.format(`
        SELECT 
          c.*,
          cs.weekdays,
          cs.open_time AS open,
          cs.close_time AS close,
          GROUP_CONCAT(DISTINCT DATE_FORMAT(css.date, '%Y-%m-%d')) AS special_dates,
          GROUP_CONCAT(DISTINCT s.name) AS specialties
        FROM clinic c
        LEFT JOIN clinic_schedule cs ON c.user_email = cs.clinic_email
        LEFT JOIN clinic_special_schedule css ON c.user_email = css.clinic_email
        LEFT JOIN doctor d ON c.user_email = d.user_email
        LEFT JOIN docspecial ds ON d.careerNo = ds.doctorID
        LEFT JOIN special s ON ds.specialID = s.special_id
        WHERE c.user_email != ? AND c.name LIKE ?
        GROUP BY c.user_email
      `, [search.email, `%${search.word}%`]);
      
      conn.query(sql, (err: any, result: any) => {
        if (err) reject(err);
        else resolve(result);
      });
    });

    // 3. Pre-calculate date/time values
    const nowInBangkok = moment(search.date).tz("Asia/Bangkok");
    const todayName = nowInBangkok.format("dddd");
    const todayStr = nowInBangkok.format("YYYY-MM-DD");
    const dateString = nowInBangkok.format("YYYY-MM-DD");
    const start = `${dateString} 00:00:00.000`;
    const end = `${dateString} 23:59:59.999`;

    // 4. Parallel Firebase query
    const snapshot = await db
      .collection("reserve")
      .select("clinicEmail", "date", "generalEmail")
      .where("generalEmail", "==", search.email)
      .where("date", ">=", start)
      .where("date", "<=", end)
      .get();

    // 5. Process Firebase data efficiently
    const specialClinics = new Set<string>();
    const clinicTimeCounts: Record<string, Record<string, number>> = {};

    snapshot.docs.forEach((doc) => {
      const data = doc.data() as { clinicEmail: string; date: string; generalEmail: string };
      if (data.clinicEmail && data.clinicEmail !== search.email) {
        specialClinics.add(data.clinicEmail);
      }

      if (!clinicTimeCounts[data.clinicEmail]) {
        clinicTimeCounts[data.clinicEmail] = {};
      }
      const time = data.date.substring(11, 16);
      clinicTimeCounts[data.clinicEmail][time] = 
        (clinicTimeCounts[data.clinicEmail][time] || 0) + 1;
    });

    // 6. Process all clinics in single pass
    const processedClinics = clinicResults.map((clinic: any) => {
      // Distance calculation
      const clinicLat = parseFloat(clinic.lat);
      const clinicLng = parseFloat(clinic.lng);
      const distanceMeters = getDistance(
        { latitude: generalLat, longitude: generalLng },
        { latitude: clinicLat, longitude: clinicLng }
      );
      const distanceKm = distanceMeters / 1000;

      // Parse special dates (from GROUP_CONCAT)
      const specialDates = clinic.special_dates ? 
        clinic.special_dates.split(',') : [];

      // Check if open today
      const openDays = clinic.weekdays ? clinic.weekdays.split(",") : [];
      const isOpenToday = openDays.includes(todayName);
      const isClosedSpecial = specialDates.includes(todayStr);
      const toDayOpen = isOpenToday && !isClosedSpecial;

      // Check if full
      const clinicEmail = clinic.user_email;
      const timeCounts = clinicTimeCounts[clinicEmail] || {};
      const allTimeSlots = generateTimeSlots(clinic.open, clinic.close, 30);
      const filledSlots = allTimeSlots.filter(
        (slot) => (timeCounts[slot] || 0) >= clinic.numPerTime
      );
      const isFull = filledSlots.length === allTimeSlots.length;

      return {
        ...clinic,
        specialties: clinic.specialties ? clinic.specialties.split(',') : [],
        special_date: specialDates,
        distanceKm,
        distance: distanceKm.toFixed(2) + " km",
        toDayOpen,
        special: specialClinics.has(clinicEmail) ? 1 : 0,
        full: isFull ? 1 : 0,
      };
    });

    // 7. Optimized sorting
    processedClinics.sort((a : any, b: any) => {
      if (a.toDayOpen && !b.toDayOpen) return -1;
      if (!a.toDayOpen && b.toDayOpen) return 1;
      return a.distanceKm - b.distanceKm;
    });

    res.status(200).json(processedClinics);

  } catch (error) {
    console.error("🔥 Error fetching data:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/data/:email", (req, res) => {
  const email = req.params.email;

  let sql = `
   SELECT 
  c.*,
  cs.open_time AS open,
  cs.close_time AS close,
  d.careerNo,
  d.name AS doctor_name,
  d.image AS doctor_image,
  s.name AS specialty_name
FROM clinic c
JOIN clinic_schedule cs ON c.user_email = cs.clinic_email
LEFT JOIN doctor d ON c.user_email = d.user_email
LEFT JOIN docspecial ds ON d.careerNo = ds.doctorID
LEFT JOIN special s ON ds.specialID = s.special_id
WHERE c.user_email = ?
  `;

  sql = mysql.format(sql, [email]);

  conn.query(sql, (err, result) => {
    if (err)
      return res.status(500).json({ error: "Database error", details: err });

    if (result.length === 0) {
      return res.status(404).json({ message: "Clinic not found" });
    }

    // Extract clinic info from first row
    const clinic = {
      user_email: result[0].user_email,
      name: result[0].name,
      phone: result[0].phone,
      address: result[0].address,
      lat: result[0].lat,
      lng: result[0].lng,
      image: result[0].image,
      open: result[0].open,
      close: result[0].close,
      numPerTime: result[0].numPerTime,
      fcmToken: result[0].fcmToken,
    };

    // Group doctors by careerNo
    const doctorMap = new Map();

    for (const row of result) {
      if (!row.careerNo) continue;

      if (!doctorMap.has(row.careerNo)) {
        doctorMap.set(row.careerNo, {
          careerNo: row.careerNo,
          name: row.doctor_name,
          phone: row.doctor_phone,
          image: row.doctor_image,
          specialties: [],
        });
      }

      const doctor = doctorMap.get(row.careerNo);
      if (
        row.specialty_name &&
        !doctor.specialties.includes(row.specialty_name)
      ) {
        doctor.specialties.push(row.specialty_name);
      }
    }

    const doctors = Array.from(doctorMap.values());

    res.status(200).json({ clinic, doctors });
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
  let sql =
    "SELECT open_time AS open, close_time AS close, numPerTime FROM clinic, clinic_schedule WHERE clinic.user_email = clinic_schedule.clinic_email AND user_email = ?";
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

    let sql =
      "SELECT open_time AS open, close_time AS close, numPerTime FROM clinic, clinic_schedule WHERE clinic.user_email = clinic_schedule.clinic_email AND user_email = ?";
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
    "INSERT INTO clinic (user_email, name, phone, address, lat, lng, image, numPerTime) VALUES ( ?, ?, ?, ?, ?, ?, ?, ?)";
  sql = mysql.format(sql, [
    clinic.user_email,
    clinic.name,
    clinic.phone,
    clinic.address,
    clinic.lat,
    clinic.lng,
    clinic.image,
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
  const openTime = open ?? "09:00";   // Default if null
  const closeTime = close ?? "17:00"; // Default if null
  const slots: string[] = [];

  const [openHour, openMinute] = openTime.split(":").map(Number);
  const [closeHour, closeMinute] = closeTime.split(":").map(Number);

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

router.delete("/:email", (req, res) => {
  let email = req.params.email;
  // change clinic to general For CLINIC USER DELETE!!!!
  let sqlCheck = "SELECT * FROM general WHERE user_email = ?";
  sqlCheck = mysql.format(sqlCheck, [email]);
  conn.query(sqlCheck, (err, result) => {
    if (err) throw err;
    if (result.length > 0) {
      let sql = "DELETE FROM clinic WHERE user_email = ?";
      sql = mysql.format(sql, [email]);

      conn.query(sql, (err, result) => {
        if (err) throw err;
        res.status(200).json({ message: "delete success" });
      });
    } else {
      let sql = "DELETE FROM user WHERE email = ?"
      sql = mysql.format(sql, [email]);

      conn.query(sql, (err, result) => {
        if (err) throw err;
        res.status(200).json({ message: "delete success" });
      });
    }
  });
});