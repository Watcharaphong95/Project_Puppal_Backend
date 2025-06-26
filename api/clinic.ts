import express from "express";
import { conn } from "../dbconnect";
import mysql from "mysql";
import { ClinicPost } from "../model/clinicPost";

export const router = express.Router();

router.get("/", (req, res) => {
  let sql = "SELECT * FROM clinic";
  conn.query(sql, (err, result) => {
    if (err) throw err;
    res.status(200).json(result);
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

router.get("/clinic/:email",(req,res)=>{
  let email = req.params.email;
  let sql = "SELECT * FROM clinic WHERE user_email = ?"
  sql = mysql.format(sql,[email]);
   conn.query(sql, (err, result) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err });
    }

    res.status(200).json(result);
  });
})
