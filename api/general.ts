import express from "express";
import { conn } from "../dbconnect";
import mysql from "mysql";
import { GeneralPost } from "../model/generalPost";
import { GeneralEditProfilePost } from "../model/generalProfileUpdate";
import { GeneralLocationPut } from "../model/generalLocationPut";
import { FcmTokenPost } from "../model/fcmTokenPost";

export const router = express.Router();

router.get("/", (req, res) => {
  let sql = "SELECT * FROM general";
  conn.query(sql, (err, result) => {
    if (err) throw err;
    res.status(200).json(result);
  });
});

router.get("/:email", (req, res) => {
  let email = req.params.email;
  let sql = "SELECT * FROM general WHERE user_email = ?";
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

router.get("/address/:email", (req, res) => {
  let email = req.params.email;
  let sql = "SELECT lat, lng FROM general WHERE user_email = ?";
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

router.get("/name/:email", (req, res) => {
  let email = req.params.email;
  let sql = "SELECT username, image FROM general WHERE user_email = ?";
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
  let general: GeneralPost = req.body;
  let sql =
    "INSERT INTO general (user_email, username, name, surname, phone, address, lat, lng, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
  sql = mysql.format(sql, [
    general.user_email,
    general.username,
    general.name,
    general.surname,
    general.phone,
    general.address,
    general.lat,
    general.lng,
    general.image,
  ]);

  conn.query(sql, (err, result) => {
    if (err) throw err;
    res.status(201).json({ message: "insert success" });
  });
});

router.put("/", (req, res) => {
  let general: GeneralEditProfilePost = req.body;
  let sql =
    "UPDATE general SET username = ?, name = ?, surname = ?, phone = ?, address = ?, image = ? WHERE user_email = ?";
  sql = mysql.format(sql, [
    general.username,
    general.name,
    general.surname,
    general.phone,
    general.address,
    general.image,
    general.user_email,
  ]);

  conn.query(sql, (err, result) => {
    if (err) throw err;
    res.status(201).json({ message: "update success" });
  });
});

router.put("/location", (req, res) => {
  let general: GeneralLocationPut = req.body;
  let sql = "UPDATE general SET lat = ?, lng = ? WHERE user_email = ?";
  sql = mysql.format(sql, [general.lat, general.lng, general.email]);

  conn.query(sql, (err, result) => {
    if (err) throw err;
    res.status(201).json({ message: "update success" });
  });
});

router.delete("/:email", (req, res) => {
  let email = req.params.email;
  // change clinic to general For CLINIC USER DELETE!!!!
  let sqlCheck = "SELECT * FROM clinic WHERE user_email = ?";
  sqlCheck = mysql.format(sqlCheck, [email]);
  conn.query(sqlCheck, (err, result) => {
    if (err) throw err;
    if (result.length > 0) {
      let sql = "DELETE FROM general WHERE user_email = ?";
      sql = mysql.format(sql, [email]);

      conn.query(sql, (err, result) => {
        if (err) throw err;
        res.status(200).json({ message: "delete success" });
      });
    } else {
      let sql = "DELETE FROM user WHERE email = ?"
      sql = mysql.format(sql, [email]);

      conn.query(sql, (err, result) => {
        if (err) throw err;
        res.status(200).json({ message: "delete success" });
      });
    }
  });
});
