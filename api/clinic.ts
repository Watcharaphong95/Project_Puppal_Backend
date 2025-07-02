import express from "express";
import { conn } from "../dbconnect";
import mysql from "mysql";
import { ClinicPost } from "../model/clinicPost";
import { ClinicSearch } from "../model/clinicSearchPost";
import { getDistance } from "geolib";

export const router = express.Router();

router.get("/", (req, res) => {
  let sql = "SELECT * FROM clinic";
  conn.query(sql, (err, result) => {
    if (err) throw err;
    res.status(200).json(result);
  });
});

router.post("/search", (req, res) => {
  let search: ClinicSearch = req.body;

  let sqlGeneral = "SELECT lat, lng FROM general WHERE user_email = ?";
  sqlGeneral = mysql.format(sqlGeneral, [search.email]);
  conn.query(sqlGeneral, (err, result) => {
    if (err) throw err;
    const generalLat = parseFloat(result[0].lat);
    const generalLng = parseFloat(result[0].lng);

    let sql = "SELECT * FROM clinic WHERE user_email != ? AND name LIKE ?";
    sql = mysql.format(sql, [search.email, `%${search.word}%`]);
    conn.query(sql, (err, result) => {
      if (err) throw err;
      const clinicsWithDistance = result.map((clinic: any) => {
        const clinicLat = parseFloat(clinic.lat);
        const clinicLng = parseFloat(clinic.lng);

        const distanceMeters = getDistance(
          { latitude: generalLat, longitude: generalLng },
          { latitude: clinicLat, longitude: clinicLng }
        );

        return {
          ...clinic,
          distanceKm: distanceMeters / 1000,
        };
      });

      clinicsWithDistance.sort((a: any, b: any) => a.distanceKm - b.distanceKm);

      const formattedClinics = clinicsWithDistance.map((clinic: any) => ({
        ...clinic,
        distance: clinic.distanceKm.toFixed(2) + " km",
      }));

      res.status(200).json(formattedClinics);
    });
  });
});

router.get("/data/:email", (req, res) => {
  let email = req.params.email;
  let sql = "SELECT * FROM clinic WHERE user_email = ?";
  sql = mysql.format(sql, [email]);
  conn.query(sql, (err, result) => {
    if (err) throw err;
    if (result.length > 0) {
      res.status(200).json(result[0]);
    } else {
      res.status(404).json({ message: "User not found" });
    }
  });
});

router.get("/name/:email", (req, res) => {
  let email = req.params.email;
  let sql = "SELECT name, image FROM clinic WHERE user_email = ?";
  sql = mysql.format(sql, [email]);
  conn.query(sql, (err, result) => {
    if (err) throw err;
    if (result.length > 0) {
      res.status(200).json(result[0]);
    } else {
      res.status(404).json({ message: "User not found" });
    }
  });
});

router.post("/", (req, res) => {
  let clinic: ClinicPost = req.body;
  let sql =
    "INSERT INTO clinic (user_email, name, phone, address, lat, lng, image, open, close, numPerTime) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
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
    clinic.numPerTime,
  ]);

  conn.query(sql, (err, result) => {
    if (err) throw err;
    res.status(201).json({ message: "insert success" });
  });
});

router.get("/clinic/:email",(req,res)=>{
  let email = req.params.email;
  let sql = "SELECT * FROM clinic WHERE user_email = ?"
  sql = mysql.format(sql,[email]);
   conn.query(sql, (err, result) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err });
    }

    res.status(200).json(result);
  });
})

router.put("/update/:email", (req, res) => {
  let email = req.params.email;
  console.log("EMAIL:", email);

  let data: ClinicPost = req.body;

  let sql = `
    UPDATE clinic 
    SET name = ?, phone = ?, address = ?, lat = ?, lng = ?, image = ?, open = ?, close = ?, numPerTime = ?
    WHERE user_email = ?
  `;

  sql = mysql.format(sql, [
    data.name,
    data.phone,
    data.address,
    data.lat,
    data.lng,
    data.image,
    data.open,
    data.close,
    data.numPerTime,
    email
  ]);

  conn.query(sql, (err, result) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err });
    }

    // เพิ่มผลลัพธ์ไว้ debug ได้ด้วย
    console.log("Affected rows:", result.affectedRows);

    res.status(200).json({ message: "Profile updated successfully" });
  });
});
