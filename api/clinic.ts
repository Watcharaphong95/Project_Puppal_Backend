import express from "express";
import { conn } from "../dbconnect";
import { UserData } from "../model/userPost";
import mysql from "mysql";
import { GeneralPost } from "../model/generalPost";
import { ClinicPost } from "../model/clinicPost";

export const router = express.Router();

router.get("/", (req, res) => {
    let sql = "SELECT * FROM clinic";
    conn.query(sql, (err, result) => {
        if (err) throw err;
        res.status(200).json(result);
    })
})

router.post("/", (req, res) => {
    let clinic: ClinicPost = req.body;
    let sql = "INSERT INTO clinic (user_email, name, phone, address, lat, lng, image, open, close, numPerTime) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
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
        clinic.numPerTime
    ])

    conn.query(sql, (err, result) => {
        if (err) throw err;
        res.status(201).json({ message: "insert success" });
    })
})