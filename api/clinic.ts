import express from "express";
import { conn } from "../dbconnect";
import { UserData } from "../model/userPost";
import mysql from "mysql";
import { GeneralPost } from "../model/generalPost";

export const router = express.Router();

router.get("/", (req, res) => {
    let sql = "SELECT * FROM clinic";
    conn.query(sql, (err, result) => {
        if (err) throw err;
        res.status(200).json(result);
    })
})