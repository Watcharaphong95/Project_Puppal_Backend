import express from "express";
import { conn } from "../dbconnect";
import mysql from "mysql";
import { InjectionRecordPost } from "../model/dogInjectionRecordPost";
import e from "express";

export const router = express.Router();

router.get("/", (req, res) => {
  let sql = "SELECT * FROM injectionRecord";

  conn.query(sql, (err, result) => {
    if (err) throw err;

    res.status(200).json(result);
  });
});

router.get("/id/:id", (req, res) => {
  const id = req.params.id;
  let sql = `
   SELECT 
  injectionRecord.rid,
  injectionRecord.reserveID,
  injectionRecord.appointment_aid,
  injectionRecord.vaccine AS injectionVaccine,
  injectionRecord.vaccine_label,
  dog.name AS dogName, 
  clinic.name AS clinicName,
  appointment.vaccine AS appointmentVaccine,
  appointment.date AS appointmentDate,
  injectionRecord.date AS injectionDate
FROM injectionRecord
JOIN reserve ON injectionRecord.reserveID = reserve.reserveID
JOIN dog ON reserve.dog_dogId = dog.dogId
JOIN clinic ON reserve.clinic_email = clinic.user_email
JOIN appointment ON injectionRecord.appointment_aid = appointment.aid
WHERE reserve.dog_dogId = ?;

  `;

  sql = mysql.format(sql, [id]);

  conn.query(sql, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Database query failed" });
    }

    const adjusted = results.map((row: any) => ({
      ...row,
      appointmentDate: row.appointmentDate
        ? new Date(row.appointmentDate).toLocaleString("sv-SE", { timeZone: "Asia/Bangkok" })
        : null,
      injectionDate: row.injectionDate
        ? new Date(row.injectionDate).toLocaleString("sv-SE", { timeZone: "Asia/Bangkok" })
        : null,
    }));

    res.status(200).json(adjusted);
  });
});


router.get("/all/:email", (req, res) => {
  let email = req.params.email;
  let sql =
    "SELECT injectionRecord.* FROM injectionRecord JOIN dog ON injectionRecord.dog_id = dog.dogId WHERE dog.user_email = ?";
  sql = mysql.format(sql, [email]);
  conn.query(sql, (err, result) => {
    if (err) throw err;

    res.status(200).json(result);
  });
});

router.post("/", (req, res) => {
  let record: InjectionRecordPost = req.body;
  const [day, month, year] = record.date.split("-");
  const formattedDate = `${year}-${month.padStart(2, "0")}-${day.padStart(
    2,
    "0"
  )}`;
  console.log(formattedDate);

  let sql =
    "INSERT INTO injectionRecord (dog_Id, clinic_user_email, general_user_email, clinicName, vaccine, date) VALUES (?,?,?,?,?,?)";
  sql = mysql.format(sql, [
    record.dog_Id,
    record.clinic_user_email,
    record.general_user_email,
    record.clinicName,
    record.vaccine,
    formattedDate,
  ]);

  conn.query(sql, (err, result) => {
    if (err) throw err;
    res.status(201).json({ insertId: result.insertId });
  });
});



