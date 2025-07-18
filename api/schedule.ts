import express from "express";
import { conn } from "../dbconnect";
import { ClinicSchedulePost } from "../model/clinicSchedulePost";
import { log } from "firebase-functions/logger";


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

router.put("/:id", (req, res) => {
  const id = req.params.id;
  const schedule: ClinicSchedulePost = req.body;

  const sql = `
    UPDATE clinic_schedule
    SET weekdays = ?, open_time = ?, close_time = ?
    WHERE sid = ?
  `;

  console.log(`Updating schedule with ID: ${id}`, schedule);

  conn.query(
    sql,
    [schedule.weekdays, schedule.open_time, schedule.close_time, id], // ✅ แก้ให้ตรงกับ SQL
    (err, result) => {
      if (err) {
        console.error("❌ Update error:", err);
        return res.status(500).json({ error: "Database update failed" });
      }
      res.status(200).json({ message: "✅ Schedule updated", result });
    }
  );
});

