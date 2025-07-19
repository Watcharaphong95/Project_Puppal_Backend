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
    dog.name as dogName, dog.breed as dogBreed, dog.gender as dogGender, dog.color as dogColor, dog.defect as dogDefect, dog.birthday as dogBirthday, dog.congentialDisease as dogCongentialDisease, dog.sterilization as dogSterilization, dog.hair as dogHair,
    dog.image AS dog_image,
    injectionRecord.rid, injectionRecord.vaccine as injectionVaccine, injectionRecord.date as injectionDate, injectionRecord.rid, injectionRecord.vaccine_label,injectionRecord.type as recordType,
    doctor.careerNo, doctor.name as doctorName, doctor.surname as doctorSurname, doctor.image AS doctor_image,
    clinic.user_email as clinicEmail, clinic.name as clinicName, clinic.phone, clinic.address, clinic.open, clinic.close,clinic.image AS clinic_image,
    oldApp.aid AS old_aid,
    oldApp.date AS old_date,
    oldApp.vaccine AS old_vaccine,
    nextApp.aid AS next_aid,
    nextApp.date AS next_date,
    nextApp.vaccine AS next_vaccine
  FROM 
  injectionRecord
LEFT JOIN appointment AS oldApp ON injectionRecord.oldAppointment_aid = oldApp.aid
LEFT JOIN appointment AS nextApp ON injectionRecord.nextAppointment_aid = nextApp.aid
  JOIN dog ON oldApp.dogId = dog.dogId
  JOIN doctor ON injectionRecord.doctorCareerNo = doctor.careerNo
  JOIN clinic ON injectionRecord.clinic_email = clinic.user_email
  WHERE 
    dog.dogId = ?
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
