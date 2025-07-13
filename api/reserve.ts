import express from "express";
import { conn } from "../dbconnect";
import mysql from "mysql";
import { ClinicSlotReq } from "../model/clinicSlotReq";
import { json } from "body-parser";
import { ReservePost } from "../model/reservePost";
import { ClinicUpdateTypePost } from "../model/clinicUpdateTypePost";
import { ClinicSlotPost } from "../model/clinicSlotPost";
import { ClinicSlotGet } from "../model/clinicSlotGet";
import { ReserveSpecialCheckPost } from "../model/reserveSpecialCheckPost";
import { ReserveDoglist } from "../model/reserveDoglist";
import moment from "moment";
import { db } from "../firebaseconnect";
import { sendFCMToken } from "../firebaseNotification";

export const router = express.Router();

router.post("/checkSpecial", async (req, res) => {
  const data: ReserveSpecialCheckPost = req.body;

  if (!data.general_email || !data.clinic_email || !data.date) {
    res.status(400).json({ error: "Missing parameters" });
  }

  try {
    // Parse date to get the day range in Asia/Bangkok timezone
    const inputMoment = moment.tz(data.date, "Asia/Bangkok");
    const dateString = inputMoment.format("YYYY-MM-DD");
    const start = `${dateString} 00:00:00.000`;
    const end = `${dateString} 23:59:59.999`;

    const snapshot = await db
      .collection("reserve")
      .where("generalEmail", "==", data.general_email)
      .where("clinicEmail", "==", data.clinic_email)
      .where("date", ">=", start)
      .where("date", "<=", end)
      .get();

    const hasReserve = !snapshot.empty;

    res.status(200).json(hasReserve);
  } catch (error) {
    console.error("🔥 Error checking reserve:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

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
        clinicPhone: r.status === 0 ? "" : r.clinicPhone || null,
        clinicLat: r.status === 0 ? "" : r.clinicLat || null,
        clinicLng: r.status === 0 ? "" : r.clinicLng || null,
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
  let sql = "UPDATE reserve SET status = 0 WHERE reserveID = ?";
  sql = mysql.format(sql, [reserveID]);
  conn.query(sql, (err, result) => {
    if (err) throw err;
    res.status(200).json({ message: result.affectedRows });
  });
});

router.post("/addRequest", (req, res) => {
  let reserve: ClinicSlotReq = req.body;
  let sql =
    "INSERT INTO reserve (general_email, clinic_email, dog_dogId, date,  appointment_aid) VALUES (?,?,?,?,?)";
  sql = mysql.format(sql, [
    reserve.general_email,
    reserve.clinic_email,
    reserve.dog_dogId,
    reserve.date,
    reserve.appointment_aid,
  ]);

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

router.post("/doglist", (req, res) => {
  let data: ReserveDoglist = req.body;

  // First, get all dogs of the user
  let sql = `
   SELECT *
   FROM dog
   WHERE user_email = ?
  `;

  sql = mysql.format(sql, [data.email]);

  conn.query(sql, (err, result) => {
    if (err) throw err;
    res.status(200).json(result);
  });
});

router.get("/:email", (req, res) => {
  let email = req.params.email;

  let sql = `
  SELECT reserve.*, general.username, general.phone
  FROM reserve
  JOIN general ON reserve.general_email = general.user_email
  WHERE reserve.clinic_email = ?
  ORDER BY reserve.date DESC
`;
  sql = mysql.format(sql, [email]);

  conn.query(sql, (err, result) => {
    if (err) throw err;
    res.status(200).json(result);
  });
});

router.get("/search_id/:id", (req, res) => {
  let id = req.params.id;

  let sql = `
    SELECT 
  reserve.*, 
  general.username, 
  general.phone,
  dog.name,
  dog.breed,
  dog.gender,
  dog.color,
  dog.defect,
  dog.birthday,
  dog.congentialDisease,
  dog.sterilization,
  dog.Hair,
  dog.image,
  appointment.aid,
  appointment.vaccine AS appointment_name
FROM reserve
JOIN general ON reserve.general_email = general.user_email
JOIN dog ON reserve.dog_dogId = dog.dogId
LEFT JOIN appointment ON reserve.appointment_aid = appointment.aid
WHERE reserve.reserveID = ?

  `;

  sql = mysql.format(sql, [id]);

  conn.query(sql, (err, result) => {
    if (err) throw err;
    res.status(200).json(result);
  });
});

router.put("/:reserveID", (req, res) => {
  let reserveID = req.params.reserveID;
  let data: ReservePost = req.body;
  let sql = "UPDATE reserve SET status = ? WHERE reserveID = ?";
  sql = mysql.format(sql, [data.status, reserveID]);
  conn.query(sql, (err, result) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err });
    }
    console.log("Affected rows:", result.affectedRows);

    res.status(200).json({ message: "Profile updated successfully" });
  });
});

router.put("/type/:reserveID", (req, res) => {
  let reserveID = req.params.reserveID;
  let data: ClinicUpdateTypePost = req.body;
  let sql = "UPDATE reserve SET type = ? WHERE reserveID = ?";
  sql = mysql.format(sql, [data.type, reserveID]);
  conn.query(sql, (err, result) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err });
    }
    console.log("Affected rows:", result.affectedRows);

    res.status(200).json({ message: "Profile updated successfully" });
  });
});

router.get("/group/:id", (req, res) => {
  let id = req.params.id;

  let sql = `
    SELECT 
      reserve.*, 
      general.*,
      dog.*
    FROM reserve
    JOIN general ON reserve.general_email = general.user_email
    JOIN dog ON reserve.dog_dogId = dog.dogId
    WHERE reserve.reserveID = ?
    ORDER BY reserve.date DESC
  `;
  interface ReserveRow {
    date: string;
    clinic_email: string;
    username: string;
    phone: string;
    name: string; // dog.name
    breed: string;
    gender: string;
    color: string;
    defect: string;
    birthday: string;
    congentialDisease: string;
    sterilization: string;
    Hair: string;
    image: string;
    // เพิ่ม field อื่น ๆ จาก SELECT ของคุณ เช่น reserveID, dog_dogId, status, type, message ฯลฯ
  }

  sql = mysql.format(sql, [id]);

  conn.query(sql, (err, results) => {
    if (err) throw err;

    // 🧠 Group by date (only date part) and clinic_email
    const grouped: { [key: string]: ReserveRow[] } = {};

    results.forEach((row: any) => {
      const dateOnly = new Date(row.date).toISOString().split("T")[0]; // yyyy-mm-dd
      const key = `${dateOnly}_${row.clinic_email}`;

      if (!grouped[key]) {
        grouped[key] = [];
      }

      grouped[key].push(row);
    });
    res.status(200).json(grouped);
  });
});

router.post("/notify/clinic-request", async (req, res) => {
  const { clinicEmail, userName } = req.body;

  // Get clinic FCM token
  const sql = mysql.format("SELECT fcmToken FROM clinic WHERE user_email = ?", [clinicEmail]);
  conn.query(sql, async (err, results) => {
    if (err) return res.status(500).json({ message: "DB error", error: err });
    if (results.length === 0 || !results[0].fcmToken) return res.status(404).json({ message: "Clinic token not found" });

    const token = results[0].fcmToken;
    const title = "📥 New Appointment Request";
    const body = `From: ${userName}`;

    await sendFCMToken(token, title, body);
    res.status(200).json({ message: "Notification sent to clinic" });
  });
});

router.post("/notify/general-reponse", async (req, res) => {
  const { generalEmail, userName } = req.body;

  // Get clinic FCM token
  const sql = mysql.format("SELECT fcmToken FROM general WHERE user_email = ?", [generalEmail]);
  conn.query(sql, async (err, results) => {
    if (err) return res.status(500).json({ message: "DB error", error: err });
    if (results.length === 0 || !results[0].fcmToken) return res.status(404).json({ message: "Clinic token not found" });

    const token = results[0].fcmToken;
    const title = "📥 Your Request has been accept";
    const body = `From: ${userName}`;

    await sendFCMToken(token, title, body);
    res.status(200).json({ message: "Notification sent to general" });
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

