import { conn } from "../dbconnect";
import express from "express";
import mysql from "mysql";
import { SpecialPost } from "../model/specialPost";
import { log } from "console";

export const router = express.Router();

router.get("/", (req, res) => {
  let sql = "SELECT * FROM special";
  conn.query(sql, (err, result) => {
    if (err) throw err;
    res.status(200).json(result);
  });
});

router.post("/", (req, res) => {
  let specialArray: SpecialPost[] = req.body; 
  specialArray.forEach((special) => {
    let sql = "INSERT INTO special (name) VALUES (?)";
    sql = mysql.format(sql, [special.name]);
    conn.query(sql, (err, result) => {
      if (err) throw err;
    });
  });
  res.status(201).json({ message: "insert success" });

});

router.get("/search", (req, res) => {
  const name = req.query.name;

  let sql = "SELECT special_id FROM special WHERE name = ?";
  let formattedSql = mysql.format(sql, [name]);

  conn.query(formattedSql, (err, result) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err });
    }
    res.status(200).json(result);
  });
});

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





