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

router.get("/dogId/:id", (req, res) => {
  const id = req.params.id;

  let sql = `
  SELECT 
    dog.name AS dogName,
    dog.breed AS dogBreed,
    dog.gender AS dogGender,
    dog.color AS dogColor,
    dog.defect AS dogDefect,
    dog.birthday AS dogBirthday,
    dog.congentialDisease AS dogCongentialDisease,
    dog.sterilization AS dogSterilization,
    dog.hair AS dogHair,
    dog.image AS dog_image,

    injectionRecord.rid,
    injectionRecord.vaccine AS injectionVaccine,
    injectionRecord.date AS injectionDate,
    injectionRecord.vaccine_label,
    injectionRecord.type AS recordType,

    doctor.careerNo,
    doctor.name AS doctorName,
    doctor.surname AS doctorSurname,
    doctor.image AS doctor_image,

    clinic.user_email AS clinicEmail,
    clinic.name AS clinicName,
    clinic.phone,
    clinic.address,
    clinic.image AS clinic_image,

    clinic_schedule.open_time AS open,
    clinic_schedule.close_time AS close,

    oldApp.aid AS old_aid,
    oldApp.date AS old_date,
    oldApp.vaccine AS old_vaccine,

    nextApp.aid AS next_aid,
    nextApp.date AS next_date,
    nextApp.vaccine AS next_vaccine

  FROM injectionRecord
  LEFT JOIN appointment AS oldApp ON injectionRecord.oldAppointment_aid = oldApp.aid
  LEFT JOIN appointment AS nextApp ON injectionRecord.nextAppointment_aid = nextApp.aid
  LEFT JOIN dog ON COALESCE(oldApp.dogId, nextApp.dogId) = dog.dogId
  LEFT JOIN doctor ON injectionRecord.doctorCareerNo = doctor.careerNo
  LEFT JOIN clinic ON injectionRecord.clinic_email = clinic.user_email
  LEFT JOIN clinic_schedule ON injectionRecord.clinic_email = clinic_schedule.clinic_email

  WHERE dog.dogId = ?
  ORDER BY injectionRecord.date DESC
  `;

  sql = mysql.format(sql, [id]);

  conn.query(sql, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Database query failed" });
    }

    const adjusted = results.map((row: any) => ({
      ...row,
      old_date: row.old_date
        ? new Date(row.old_date).toLocaleString("sv-SE", {
            timeZone: "Asia/Bangkok",
          })
        : null,
      next_date: row.next_date
        ? new Date(row.next_date).toLocaleString("sv-SE", {
            timeZone: "Asia/Bangkok",
          })
        : null,
      injectionDate: row.injectionDate
        ? new Date(row.injectionDate).toLocaleString("sv-SE", {
            timeZone: "Asia/Bangkok",
          })
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



