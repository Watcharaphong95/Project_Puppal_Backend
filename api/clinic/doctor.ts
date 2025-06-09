import express from "express";
import { conn } from "../../dbconnect";
import mysql from "mysql";
import { DoctorPost } from "../../model/doctorPost";

export const router = express.Router();

router.get("/", (req, res) => {
  let sql = "SELECT * FROM doctor";
  conn.query(sql, (err, result) => {
    if (err) throw err;
    res.status(200).json(result);
  });
});

router.get("/:careerNo", (req, res) => {
  let careerNo = req.params.careerNo;
  let sql = "SELECT * FROM doctor WHERE careerNo = ?";
  sql = mysql.format(sql, [careerNo]);
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
    let doctor: DoctorPost = req.body;
    let sql = "INSERT INTO doctor (user_email, name, surname, careerNo, special, image) VALUES (?, ?, ?, ?, ?, ?)";
    sql = mysql.format(sql, [
        doctor.user_email,
        doctor.name,
        doctor.surname,
        doctor.careerNo,
        doctor.special,
        doctor.image
    ])

    conn.query(sql, (err, result) => {
        if (err) throw err;
        res.status(201).json({ message: "insert success" });
    })
})

