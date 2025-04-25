import express from "express";
import { conn } from "../dbconnect";
import { UserData } from "../model/userPost";
import mysql from "mysql";

export const router = express.Router();

router.get("/", (req, res) => {
    let sql = "SELECT * FROM user";
    conn.query(sql, (err, result) => {
        if (err) throw err;
        res.status(200).json(result);
    })
})

router.post("/", (req, res) => {
  let user: UserData = req.body;
  let sql =
    "INSERT INTO user (email, password, general, clinic) VALUES (?, ?, ?, ?)";
  sql = mysql.format(sql, [
    user.email,
    user.password,
    user.general,
    user.clinic,
  ]);

  conn.query(sql, (err, result) => {
    if (err) throw err;
    res.status(201).json({ message: "insert success" });
  });
});
