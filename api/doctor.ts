import express from "express";
import { conn } from "../dbconnect";
import mysql from "mysql";
import { DoctorPost } from "../model/doctorPost";
import { log } from "console";
import e from "express";

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
  let sql = "INSERT INTO doctor (user_email, name, surname, careerNo,  image) VALUES ( ?, ?, ?, ?, ?)";
  sql = mysql.format(sql, [
    doctor.user_email,
    doctor.name,
    doctor.surname,
    doctor.careerNo,
    doctor.image
  ])

  conn.query(sql, (err, result) => {
    if (err) throw err;
    res.status(201).json({ message: "insert success" });
  })
})

router.get("/searchemail/:email", (req, res) => {
  const user_email = req.params.email;
  log(user_email);

  let sql = "SELECT * FROM doctor WHERE user_email = ?";
  sql = mysql.format(sql, [user_email]);

  conn.query(sql, (err, result) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err });
    }

    res.status(200).json(result);
  });
});


router.get("/searche/:email/:name", (req, res) => {
  const email = req.params.email;
  const name = req.params.name;
  console.log(email, name);

  let sql = "SELECT * FROM doctor WHERE user_email = ? AND name LIKE ?";
  sql = mysql.format(sql, [email, `%${name}%`]);

  conn.query(sql, (err, result) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err });
    }

    res.status(200).json(result);
  });
});

router.put("/editprofile/:careerNo",(req, res) => {
  const careerNo = req.params.careerNo;
  const { name, surname, image } = req.body;
  const sql = "UPDATE doctor SET name = ?, surname = ?, image = ? WHERE careerNo = ?";
  const formattedSql = mysql.format(sql, [name, surname, image, careerNo]);

  conn.query(formattedSql, (err, result) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err });
    }
    res.status(200).json({ message: "Profile updated successfully" });
  });
})




