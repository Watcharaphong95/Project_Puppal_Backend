import express from "express";
import { conn } from "../dbconnect";
import mysql from "mysql";
import { GeneralPost } from "../model/generalPost";

export const router = express.Router();

router.get("/", (req, res) => {
    let sql = "SELECT * FROM general";
    conn.query(sql, (err, result) => {
        if (err) throw err;
        res.status(200).json(result);
    })
})

router.get("/:email", (req, res) => {
    let email = req.params.email;
    let sql = "SELECT * FROM general WHERE user_email = ?";
    sql = mysql.format(sql, [email]);
    conn.query(sql, (err, result) => {
        if(err) throw err;
        if(result.length > 0) {
            res.status(200).json(result[0]);
        } else {
            res.status(404).json({ message: "User not found" });
        }
    })


})

router.post("/", (req, res) => {
    let general: GeneralPost = req.body;
    let sql = "INSERT INTO general (user_email, username, name, surname, phone, address, lat, lng, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
    sql = mysql.format(sql, [
        general.user_email,
        general.username,
        general.name,
        general.surname,
        general.phone,
        general.address,
        general.lat,
        general.lng,
        general.image
    ]);

    conn.query(sql, (err, result) => {
        if (err) throw err;
        res.status(201).json({ message: "insert success" });
    })
})