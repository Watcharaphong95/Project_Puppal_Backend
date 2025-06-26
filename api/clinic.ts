import express from "express";
import { conn } from "../dbconnect";
import mysql from "mysql";
import { ClinicPost } from "../model/clinicPost";
import { ClinicSearch } from "../model/clinicSearchPost";
import { getDistance } from "geolib";
import { ClinicSlotGet } from "../model/clinicSlotGet";
import { ClinicSlotPost } from "../model/clinicSlotPost";

export const router = express.Router();

router.get("/", (req, res) => {
  let sql = "SELECT * FROM clinic";
  conn.query(sql, (err, result) => {
    if (err) throw err;
    res.status(200).json(result);
  });
});

router.post("/search", (req, res) => {
  let search: ClinicSearch = req.body;

  let sqlGeneral = "SELECT lat, lng FROM general WHERE user_email = ?";
  sqlGeneral = mysql.format(sqlGeneral, [search.email]);
  conn.query(sqlGeneral, (err, result) => {
    if (err) throw err;
    const generalLat = parseFloat(result[0].lat);
    const generalLng = parseFloat(result[0].lng);

    let sql = "SELECT * FROM clinic WHERE user_email != ? AND name LIKE ?";
    sql = mysql.format(sql, [search.email, `%${search.word}%`]);
    conn.query(sql, (err, result) => {
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

      res.status(200).json(formattedClinics);
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
      const timeSlot = generateTimeSlots(
          clinic.open,
          clinic.close,
          30,
        );
        res.status(200).json({ ...clinic, timeSlots: timeSlot });
    } else {
      res.status(404).json({ message: "User not found" });
    }
  });
});

router.post("/slot", (req, res) => {
  let input: ClinicSlotPost = req.body;
  const inputDate = new Date(input.date).toISOString().slice(0, 10);
  let sql = "SELECT open, close, numPerTime FROM clinic WHERE user_email = ?";
  sql = mysql.format(sql, [input.email]);
  conn.query(sql, (err, result) => {
    if (err) throw err;
    if (result.length > 0) {
      let clinic: ClinicSlotGet = result[0];
      let sql2 =
        "SELECT TIME(date) as time FROM reserve WHERE clinic_email = ? AND DATE(date) = ? GROUP BY TIME(date) HAVING COUNT(*) >= ?";
      sql2 = mysql.format(sql2, [input.email, inputDate, clinic.numPerTime]);
      conn.query(sql2, (err, result) => {
        if (err) throw err;

        const combined: { time: string } = {
          time: result.map((r: any) => r.time).join(", "),
        };
        const filledSlots = combined.time
          .split(",")
          .map((s) => s.trim().slice(0, 5));

        // res.status(200).json(combined);
        const timeSlot = generateTimeSlots(
          clinic.open,
          clinic.close,
          30,
          filledSlots
        );
        res.status(200).json({ ...clinic, timeSlots: timeSlot });
      });
    } else {
      res.status(404).json({ message: "User not found" });
    }
  });
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
