import express from "express";
import { conn } from "../dbconnect";
import mysql from "mysql";
import { ClinicSlotReq } from "../model/clinicSlotReq";
import { json } from "body-parser";

export const router = express.Router();

router.get("/", (req, res) => {
  let sql = "SELECT * FROM reserve";
  conn.query(sql, (err, result) => {
    if (err) throw err;
    res.status(200).json(result);
  });
});

router.post("/addRequest", (req, res) => {
  let reserve: ClinicSlotReq = req.body;
  let sql = "INSERT INTO reserve (general_email, clinic_email, dog_dogId, date, typeVaccine) VALUES (?,?,?,?,?)";
  sql = mysql.format(sql, [
    reserve.general_email,
    reserve.clinic_email,
    reserve.dog_dogId,
    reserve.date,
    reserve.typeVaccine,
  ])
  conn.query(sql, (err, result) => {
    if(err) throw err;
    res.status(201).json({ message: "insert complete"})
  })
})