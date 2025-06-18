import express from "express";
import { conn } from "../dbconnect";
import mysql from "mysql";

export const router = express.Router();

router.get("/search_doctorID/:id", (req, res) => {
  const doctorId = req.params.id;

  let sql = `
    SELECT s.name AS specialName,specialID
    FROM docspecial ds
    JOIN special s ON ds.specialID = s.special_id
    WHERE ds.doctorID = ?
  `;
  let formattedSql = mysql.format(sql, [doctorId]);

  conn.query(formattedSql, (err, result) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err });
    }
    res.status(200).json(result);
  });
});

router.delete("/:careerNo/:docspecialID", (req, res) => {
  const doctorID = req.params.careerNo;
  const docspecialID = req.params.docspecialID;

  let sql = "DELETE FROM docspecial WHERE docspecialID = ? AND doctorID = ?";
  let formattedSql = mysql.format(sql, [docspecialID, doctorID]);

  conn.query(formattedSql, (err, result) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err });
    }
    res.status(200).json({ message: "Special deleted successfully" });
  });
})

router.get("/check/:doctorId/:specialId", (req, res) => {
  const doctorId = req.params.doctorId;
  const specialId = req.params.specialId;

  let sql = "SELECT 1 FROM docspecial WHERE doctorID = ? AND specialID = ?";
  let formattedSql = mysql.format(sql, [doctorId, specialId]);

  conn.query(formattedSql, (err, result) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err });
    }
    const exists = result.length > 0;
    res.status(200).json({ exists });
  });
});