import express from "express";
import { conn } from "../dbconnect";
import { UserData } from "../model/userPost";
import mysql from "mysql";
import { GeneralPost } from "../model/generalPost";
import { ClinicPost } from "../model/clinicPost";

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
