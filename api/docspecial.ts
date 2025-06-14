import express from "express"
import { conn } from "../dbconnect";
import mysql from "mysql";

export const router = express.Router();

router.get("/", (req, res) => {
  let sql = "SELECT * FROM docspecial";
  conn.query(sql, (err, result) => {
    if (err) throw err;
    res.status(200).json(result);
  });
});

router.post("/", (req, res) => {
  let docSpecialPost = req.body;
  let sql = "INSERT INTO docspecial (doctorID, specialID) VALUES (?, ?)";
  sql = mysql.format(sql, [docSpecialPost.doctorID, docSpecialPost.specialID]);

  conn.query(sql, (err, result) => {
    if (err) throw err;
    res.status(201).json({ message: "insert success" });
  });
});