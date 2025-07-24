import express from "express";
import { conn } from "../dbconnect";
import mysql from "mysql";
import { DogPost } from "../model/dogPost";
import { json } from "body-parser";
import { InjectionRecordPost } from "../model/dogInjectionRecordPost";
import { DogsEmailGet } from "../model/dogEmailGet";

export const router = express.Router();

router.get("/getdog/:id", (req, res) => {
  let id = req.params.id;
  let sql = "SELECT * FROM dog WHERE dogId = ?";
  sql = mysql.format(sql, [id]);
  conn.query(sql, (err, result) => {
    if (err) throw err;
    res.status(200).json(result);
  });
});

router.get("/:email", (req, res) => {
  let email = req.params.email;
  let sql = "SELECT * FROM dog WHERE user_email = ?";
  sql = mysql.format(sql, [email]);
  conn.query(sql, (err, result) => {
    if (err) throw err;
    res.status(200).json(result);
  });
});

router.get("/data/:id", (req, res) => {
  let id = req.params.id;
  let sql = "SELECT * FROM dog WHERE dogId = ?";
  sql = mysql.format(sql, [id]);

  conn.query(sql, (err, result) => {
    if (err) throw err;

    if (result.length > 0) {
      const dog = result[0];

      // Format birthday: dd-Month-yyyy (e.g., 15-August-2024)
      const date = new Date(dog.birthday);
      const day = date.getDate().toString().padStart(2, "0");
      const month = date.toLocaleString("th-TH", {
        month: "long",
        timeZone: "Asia/Bangkok", // optional for exact day in Thai time
      });
      const year = date.getFullYear();
      dog.birthday = `${day}-${month}-${year}`;

      res.status(200).json([dog]);
    } else {
      res.status(404).json({ message: "Dog not found" });
    }
  });
});

router.put("/", (req, res) => {
  let dog: DogsEmailGet = req.body;
  let sql =
    "UPDATE dog SET name = ?, breed = ?, gender = ?, color = ?, defect = ?, birthday = ?, congentialDisease = ?,  sterilization = ?,  Hair = ?,  image = ?  WHERE dogId = ?";
  sql = mysql.format(sql, [
    dog.name,
    dog.breed,
    dog.gender,
    dog.color,
    dog.defect,
    dog.birthday,
    dog.congentialDisease,
    dog.sterilization,
    dog.Hair,
    dog.image,
    dog.dogId,
  ]);

  conn.query(sql, (err, result) => {
    if (err) throw err;
    res.status(201).json({ message: "update success" });
  });
});

router.delete("/:dogId", (req, res) => {
  let dogId = req.params.dogId;
  let sql = "DELETE FROM dog WHERE dogId = ?";
  sql = mysql.format(sql, [dogId]);

  conn.query(sql, (err, result) => {
    if (err) throw err;
    res.status(200).json({ message: "delete success" });
  });
});

router.get("/appointmet/:id", (req, res) => {
  let id = req.params.id;
  let sql = "SELECT * FROM dog WHERE dogId = ?";
  sql = mysql.format(sql, [id]);
  conn.query(sql, (err, result) => {
    if (err) throw err;
    res.status(200).json(result);
  });
});

router.get("/nextVaccine/:email", (req, res) => {
  let email = req.params.email;
  let sql =
    "SELECT dog.*, injectionRecord.vaccineType, injectionRecord.date FROM dog LEFT JOIN injectionRecord ON dog.dogId = injectionRecord.dog_Id WHERE dog.user_email = ?";
  sql = mysql.format(sql, [email]);

  conn.query(sql, (err, result) => {
    if (err) throw err;
    if (result.length > 0) {
      let dog: DogsEmailGet[] = result;
      let sqlVac = "SELECT * FROM vaccine WHERE vid < 3";
      conn.query(sqlVac, (err, result) => {
        if (err) throw err;
        res.status(200).json(result);
      });
    } else {
      res.status(404).json({ message: "No dogs found for this email" });
    }
  });
});

router.post("/", (req, res) => {
  let dog: DogPost = req.body;

  // const [day, month, year] = dog.birthday.split("-");
  // const formattedDate = `${year}-${month.padStart(2, "0")}-${day.padStart(
  //   2,
  //   "0"
  // )}`;
  // console.log(formattedDate);

  let sql =
    "INSERT INTO dog (user_email, name, breed, gender, color, defect, birthday, congentialDisease, sterilization, hair, image) VALUES (?,?,?,?,?,?,?,?,?,?,?)";
  sql = mysql.format(sql, [
    dog.user_email,
    dog.name,
    dog.breed,
    dog.gender,
    dog.color,
    dog.defect,
    dog.birthday,
    dog.congentialDisease,
    dog.sterilization,
    dog.hair,
    dog.image,
  ]);

  conn.query(sql, (err, result) => {
    if (err) throw err;
    res.status(201).json({ insertId: result.insertId });
  });
});

router.get("/details/:id", (req, res) => {
  let id = req.params.id;
  let sql =
    "SELECT dog.*,appointment.* FROM dog JOIN appointment on dog.dogId =  appointment.dogId JOIN injectionRecord on dog.dogId = injectionRecord. WHERE dog.dogId = ?";
  sql = mysql.format(sql, [id]);
  conn.query(sql, (err, result) => {
    if (err) throw err;
    res.status(200).json(result);
  });
});
