import express from "express";
import { conn } from "../dbconnect";
import mysql from "mysql";
import { InjectionRecordPost } from "../model/dogInjectionRecordPost";
import e from "express";

export const router = express.Router();

router.get("/:id", (req, res) => {
    let id = req.params.id;
    let sql = "SELECT * FROM injectionRecord WHERE dog_id = ?"
    sql = mysql.format(sql, [
      id
    ])
    conn.query(sql, (err, result) => {
        if (err) throw err;

        res.status(200).json(result);
      });
})

router.get("/all/:email", (req, res) => {
    let email = req.params.email;
    let sql = "SELECT injectionRecord.* FROM injectionRecord JOIN dog ON injectionRecord.dog_id = dog.dogId WHERE dog.user_email = ?"
    sql = mysql.format(sql, [
      email
    ])
    conn.query(sql, (err, result) => {
        if (err) throw err;

        res.status(200).json(result);
      });
})

router.post("/", (req, res) => {
  let record: InjectionRecordPost = req.body;
  const [day, month, year] = record.date.split("-");
  const formattedDate = `${year}-${month.padStart(2, "0")}-${day.padStart(2,"0")}`;
  console.log(formattedDate);
  

  let sql =
    "INSERT INTO injectionRecord (dog_Id, clinicName, vaccineType, date) VALUES (?,?,?,?)";
  sql = mysql.format(sql, [
    record.dog_Id,
    record.clinicName,
    record.vaccineType,
    formattedDate,
  ]);

  conn.query(sql, (err, result) => {
    if (err) throw err;
    res.status(201).json({ insertId: result.insertId });
  });
});
