import { conn } from "../../dbconnect";
import express from "express";
import mysql from "mysql";

export const router = express.Router();

router.get("/", (req, res) => {
  let sql = "SELECT * FROM special";
  conn.query(sql, (err, result) => {
    if (err) throw err;
    res.status(200).json(result);
  });
});

router.post("/", (req, res) => {
  let {name} = req.body;
  let sql = "INSERT INTO special (name) VALUES (?)";
  sql = mysql.format(sql, [name]);

  conn.query(sql, (err, result) => {
    if (err) throw err;
    res.status(201).json({ message: "insert success" });
  });
});