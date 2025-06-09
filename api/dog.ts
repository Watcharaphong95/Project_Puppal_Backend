import express from "express";
import { conn } from "../dbconnect";
import mysql from "mysql";
import { DogPost } from "../model/dogPost";

export const router = express.Router();

router.get("/:email", (req, res) => {
  let email = req.params.email;
    let sql = "SELECT * FROM dog WHERE user_email = ?";
    sql = mysql.format(sql, [
      email
    ])
    conn.query(sql, (err, result) => {
        if (err) throw err;
        res.status(200).json(result);
    })
})

router.get("/data/:id", (req, res) => {
  let id = req.params.id;
    let sql = "SELECT * FROM dog WHERE dogId = ?";
    sql = mysql.format(sql, [
      id
    ])
    conn.query(sql, (err, result) => {
        if (err) throw err;
        res.status(200).json(result);
    })
})

router.post("/", (req, res) => {
  let dog: DogPost = req.body;
  
  const [day, month, year] = dog.birthday.split("-");
  const formattedDate = `${year}-${month.padStart(2, "0")}-${day.padStart(2,"0")}`;
  console.log(formattedDate);

  let sql =
    "INSERT INTO dog (user_email, name, breed, gender, color, defect, birthday, congentialDisease, sterilization, hair, image) VALUES (?,?,?,?,?,?,?,?,?,?,?)";
  sql = mysql.format(sql, [
    dog.user_email,
    dog.name,
    dog.breed,
    dog.gender,
    dog.color,
    dog.defect,
    formattedDate,
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

router.get("/appointmet/:email", (req, res) => {
  let email = req.params.email;
    let sql = "SELECT * FROM dog WHERE dogId = ?";
    sql = mysql.format(sql, [
      email
    ])
    conn.query(sql, (err, result) => {
        if (err) throw err;
        res.status(200).json(result);
    })
})


