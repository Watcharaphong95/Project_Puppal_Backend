import express from "express"
import { conn } from "../dbconnect";
import mysql from "mysql";
import { log } from "console";

export const router = express.Router();

router.get("/", (req, res) => {
  let sql = "SELECT * FROM docspecial";
  conn.query(sql, (err, result) => {
    if (err) throw err;
    res.status(200).json(result);
  });
});

router.post("/", (req, res) => {
  let docSpecialPost = req.body;
  let sql = "INSERT INTO docspecial (doctorID, specialID) VALUES (?, ?)";
  sql = mysql.format(sql, [docSpecialPost.doctorID, docSpecialPost.specialID]);

  conn.query(sql, (err, result) => {
    if (err) throw err;
    res.status(201).json({ message: "insert success" });
  });
});

router.get("/search_doctorID/:id", (req, res) => {
  const doctorId = req.params.id;

  let sql = `
    SELECT docspecialID,s.name AS specialName,specialID
    FROM docspecial ds
    JOIN special s ON ds.specialID = s.special_id
    WHERE ds.doctorID = ?
  `;
  let formattedSql = mysql.format(sql, [doctorId]);

  conn.query(formattedSql, (err, result) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err });
    }
    res.status(200).json(result);
  });
});

router.get("/search_namedocspecial/:name", (req, res) => {
  const name = req.params.name;

  let sql = `
    SELECT * FROM docspecial ds
    JOIN special s ON ds.specialID = s.special_id 
  `;
  let formattedSql = mysql.format(sql, [name]);

  conn.query(formattedSql, (err, result) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err });
    }
    res.status(200).json(result);
  });
});

router.delete("/:docspecialID", (req, res) => {
  const docspecialID = req.params.docspecialID;
  log(docspecialID);

  let sql = "DELETE FROM docspecial WHERE docspecialID = ? ";
  let formattedSql = mysql.format(sql, [docspecialID]);

  conn.query(formattedSql, (err, result) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err });
    }
    res.status(200).json({ message: "Special deleted successfully" });
  });
})

router.get("/check/:doctorId/:specialId", (req, res) => {
  const doctorId = req.params.doctorId;
  const specialId = req.params.specialId;

  let sql = "SELECT 1 FROM docspecial WHERE doctorID = ? AND specialID = ?";
  let formattedSql = mysql.format(sql, [doctorId, specialId]);

  conn.query(formattedSql, (err, result) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err });
    }
    const exists = result.length > 0;
    res.status(200).json({ exists });
  });
});


router.get("/getnamespecial/:name", (req, res) => {
  const name = req.params.name;
  log(name);
  let sql = `
  SELECT 
    special.name, 
    docspecial.docspecialID AS docspecialId, 
    docspecial.doctorID AS doctorId 
  FROM special 
  JOIN docspecial ON special.special_id = docspecial.specialID 
  WHERE special.name = ?
`;

  let formattedSql = mysql.format(sql, [name]);

  conn.query(formattedSql, (err, result) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err });
    }
    if (result.length > 0) {
      res.status(200).json(result);
    } else {
      res.status(404).json({ message: "DocSpecial not found" });
    }
  });
});
