import express from "express";
import { conn } from "../dbconnect";
import mysql from "mysql";
import { ClinicSlotReq } from "../model/clinicSlotReq";
import { json } from "body-parser";
import { ClinicSlotPost } from "../model/clinicSlotPost";
import { ClinicSlotGet } from "../model/clinicSlotGet";
import { ReserveSpecialCheckPost } from "../model/reserveSpecialCheckPost";
import { ReserveDoglist } from "../model/reserveDoglist";

export const router = express.Router();

router.get("/", (req, res) => {
  let sql = "SELECT * FROM reserve";
  conn.query(sql, (err, result) => {
    if (err) throw err;
    res.status(200).json(result);
  });
});

router.get("/general/:email", (req, res) => {
  const email = req.params.email;

  let sql = `
  SELECT 
  r.reserveID,
    r.date,
    r.status,
    d.dogId,
    d.name,
    d.image,
    d.birthday,
    a.aid,
    a.vaccine,
    c.name AS clinicName,
    c.image AS clinicImage,
    c.phone AS clinicPhone,
    c.lat AS clinicLat,
    c.lng AS clinicLng
  FROM reserve r
  JOIN dog d ON r.dog_dogId = d.dogId
  LEFT JOIN clinic c ON r.clinic_email = c.user_email
  LEFT JOIN appointment a ON r.appointment_aid = a.aid
  WHERE r.general_email = ? AND r.status != 0

  UNION

  SELECT 
  NULL AS reserveID,
    a.date,
    0 AS status,
    d.dogId,
    d.name,
    d.image,
    d.birthday,
    a.aid,
    a.vaccine,
    NULL AS clinicName,
    NULL AS clinicImage,
    NULL AS clinicPhone,
    NULL AS clinicLat,
    NULL AS clinicLng
  FROM appointment a
  JOIN dog d ON a.dogId = d.dogId
  WHERE a.general_user_email = ?
    AND (
      a.aid NOT IN (SELECT appointment_aid FROM reserve WHERE appointment_aid IS NOT NULL)
      OR a.aid IN (
        SELECT appointment_aid FROM reserve WHERE status = 0 AND general_email = ?
      )
    )

  ORDER BY date DESC
`;
  sql = mysql.format(sql, [email, email, email]);

  conn.query(sql, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Database query failed" });
    }

    const grouped: any = {};

    results.forEach((r: any) => {
      const date = new Date(r.date).toLocaleDateString("sv-SE", {
        timeZone: "Asia/Bangkok",
      });

      // If status = 0 (appointment only), time = null
      const time =
        r.status === 0
          ? ""
          : new Date(r.date).toLocaleTimeString("sv-SE", {
              timeZone: "Asia/Bangkok",
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            });

      if (!grouped[date]) {
        grouped[date] = [];
      }

      const vaccines = r.vaccine
        ? r.vaccine.includes(",")
          ? r.vaccine.split(",").map((v: string) => v.trim())
          : [r.vaccine.trim()]
        : [];

      grouped[date].push({
        reserveID: r.reserveID,
        aid: r.aid || null,
        status: r.status,
        dogId: r.dogId,
        name: r.name,
        image: r.image,
        birthday: r.birthday,
        vaccines,
        time,
        clinicName: r.status === 0 ? "" : r.clinicName || null,
        clinicImage: r.status === 0 ? "" : r.clinicImage || null,
        clinicPhone: r.status === 0 ? "" : r. clinicPhone || null,
        clinicLat: r.status === 0 ? "" : r. clinicLat || null,
        clinicLng: r.status === 0 ? "" : r. clinicLng || null,
      });
    });

    const response = Object.entries(grouped).map(([date, dogs]) => ({
      date,
      dogs,
    }));

    res.status(200).json(response);
  });
});

router.put("/cancleReserve/:reserveId", (req, res) => {
  let reserveID = req.params.reserveId;
  let sql = "UPDATE reserve SET status = 0 WHERE reserveID = ?"
  sql = mysql.format(sql, [reserveID]);
  conn.query(sql, (err, result) => {
    if(err) throw err;
    res.status(200).json({message: result.affectedRows})
  })
})

router.post("/addRequest", (req, res) => {
  let reserve: ClinicSlotReq = req.body;

  let sqlCheck = `
    SELECT * FROM reserve 
    WHERE dog_dogId = ? AND DATE(date) = DATE(?)
  `;
  sqlCheck = mysql.format(sqlCheck, [reserve.dog_dogId, reserve.date]);

  conn.query(sqlCheck, (err, result) => {
    if (err) throw err;

    if (result.length > 0) {
      if (result[0].status != 0) {
        res.status(400).json({ message: "already reserve" });
        return;
      }
      let existing = result[0];
      if (existing.status) {
      }
      let sqlUpdate = `
        UPDATE reserve
        SET general_email = ?, clinic_email = ?, appointment_aid = ?, type = ?, status = ?
        WHERE reserveId = ?
      `;
      sqlUpdate = mysql.format(sqlUpdate, [
        reserve.general_email,
        reserve.clinic_email,
        reserve.appointment_aid,
        reserve.type || 0,
        1,
        existing.reserveID,
      ]);

      conn.query(sqlUpdate, (err, result) => {
        if (err) throw err;
        res.status(201).json({ message: "reserve updated" });
      });
    } else {
      // Not found → Insert new
      let sqlInsert = `
        INSERT INTO reserve (general_email, clinic_email, dog_dogId, appointment_aid, date, type)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      sqlInsert = mysql.format(sqlInsert, [
        reserve.general_email,
        reserve.clinic_email,
        reserve.dog_dogId,
        reserve.appointment_aid,
        reserve.date,
        reserve.type || 0,
      ]);

      conn.query(sqlInsert, (err, result) => {
        if (err) throw err;
        res.status(201).json({ message: "reserve inserted" });
      });
    }
  });
});

router.post("/checkSpecial", (req, res) => {
  let input: ReserveSpecialCheckPost = req.body;
  const inputDate = new Date(input.date).toISOString().slice(0, 10);
  let sql = "SELECT open, close, numPerTime FROM clinic WHERE user_email = ?";
  sql = mysql.format(sql, [input.clinic_email]);
  conn.query(sql, (err, result) => {
    if (err) throw err;
    if (result.length > 0) {
      let clinic: ClinicSlotGet = result[0];
      let sql2 =
        "SELECT TIME(date) as time FROM reserve WHERE clinic_email = ? AND general_email = ? AND DATE(date) = ? GROUP BY TIME(date) HAVING COUNT(*) >= ?";
      sql2 = mysql.format(sql2, [
        input.clinic_email,
        input.general_email,
        inputDate,
        clinic.numPerTime,
      ]);
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
        if (timeSlot.length == 0) {
          res.status(200).json(true);
        } else {
          res.status(400).json(false);
        }
      });
    } else {
      res.status(404).json({ message: "User not found" });
    }
  });
});

router.post("/doglist", (req, res) => {
  let data: ReserveDoglist = req.body;

  // First, get all dogs of the user
  let sql = `
    SELECT 
      d.*, 
      IF(r.dog_dogId IS NOT NULL, 0, 1) AS status 
    FROM dog d
    LEFT JOIN (
      SELECT dog_dogId 
      FROM reserve 
      WHERE general_email = ? AND DATE(date) = DATE(?) AND status != 0
    ) r ON d.dogId = r.dog_dogId
    WHERE d.user_email = ?
    ORDER BY status desc
  `;

  sql = mysql.format(sql, [data.email, data.date, data.email]);

  conn.query(sql, (err, result) => {
    if (err) throw err;
    res.status(200).json(result);
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
