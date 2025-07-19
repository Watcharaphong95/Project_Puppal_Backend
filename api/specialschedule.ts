import express from "express";
import { conn } from "../dbconnect";
import { ClinicSchedulePost } from "../model/clinicSchedulePost";
import { ClinicSpecialSchedulePost } from "../model/ClinicSpecialSchedulePost";
import { log } from "firebase-functions/logger";

export const router = express.Router();

router.get("/", (req, res) => {
    let sql = "SELECT * FROM clinic_special_schedule";
    conn.query(sql, (err, result) => {
        if (err) throw err;
        res.status(200).json(result);
    });
});

router.get("/:email", (req, res) => {
    let email = req.params.email;
    let sql = "SELECT * FROM clinic_special_schedule WHERE clinic_email = ?";
    conn.query(sql,[email], (err, result) => {
        if (err) throw err;
        res.status(200).json(result);
    });
});

router.post("/", (req, res) => {
  const specialschedule: ClinicSpecialSchedulePost = req.body;

  const sql = `
    INSERT INTO clinic_special_schedule (clinic_email, date)
    VALUES (?, ?)
  `;
log(sql);
  conn.query(sql, [specialschedule.clinic_email, specialschedule.date], (err, result) => {
    if (err) {
      console.error("❌ Insert error:", err);
      return res.status(500).json({ error: "Insert failed" });
    }
    res.status(201).json({ message: "✅ Special schedule added", result });
  });
});

router.delete("/:id", (req, res) => {
  const id = req.params.id;
  const sql = "DELETE FROM clinic_special_schedule WHERE special_schedule_id = ?";

  conn.query(sql, [id], (err, result) => {
    if (err) {
      console.error("❌ Delete error:", err);
      return res.status(500).json({ error: "Delete failed" });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "No schedule found with that ID" });
    }
    res.status(200).json({ message: "✅ Special schedule deleted" });
  });
});