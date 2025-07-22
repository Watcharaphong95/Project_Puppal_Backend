import express from "express";
import { conn } from "../dbconnect";
import { ClinicSchedulePost } from "../model/clinicSchedulePost";
import { log } from "firebase-functions/logger";
import mysql from "mysql";


export const router = express.Router();



router.get("/", (req, res) => {
    let sql = "SELECT * FROM clinic_schedule";
    conn.query(sql, (err, result) => {
        if (err) throw err;
        res.status(200).json(result);
    });
});

router.get("/:email", (req, res) => {
    let email = req.params.email;
    let sql = "SELECT * FROM clinic_schedule WHERE clinic_email = ?";
    conn.query(sql, [email], (err, result) => {
        if (err) throw err;
        res.status(200).json(result);
    });
});

router.put("/:email", (req, res) => {
  const email = req.params.email;
  const schedule: ClinicSchedulePost = req.body;

  const sql = `
    UPDATE clinic_schedule
    SET weekdays = ?, open_time = ?, close_time = ?
    WHERE clinic_email = ?
  `;

  console.log(`Updating schedule with ID: ${email}`, schedule);

  conn.query(
    sql,
    [schedule.weekdays, schedule.open_time, schedule.close_time, email], // ✅ แก้ให้ตรงกับ SQL
    (err, result) => {
      if (err) {
        console.error("❌ Update error:", err);
        return res.status(500).json({ error: "Database update failed" });
      }
      res.status(200).json({ message: "✅ Schedule updated", result });
    }
  );
});


router.post("/", (req, res) => {
  const schedule: ClinicSchedulePost = req.body;



  // SQL
  const sql = mysql.format(
    "INSERT INTO clinic_schedule (clinic_email, weekdays, open_time, close_time) VALUES (?, ?, ?, ?)",
    [
      schedule.clinic_email,
      schedule.weekdays, // สมมติเป็น String เช่น 'Mon,Tue,Wed'
      schedule.open_time,
      schedule.close_time,
    ]
  );
  console.log('Received schedule data:', schedule);


  conn.query(sql, (err, result) => {
    if (err) {
      console.error("❌ MySQL Insert Error:", err);
      return res.status(500).json({ message: "Database error", error: err });
    }

    res.status(201).json({
      message: "Insert success",
      insertId: result.insertId,
    });
  });
});

