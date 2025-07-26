import { conn } from "../dbconnect";
import express from "express";
import mysql from "mysql";
import { SpecialPost } from "../model/specialPost";
import { log } from "console";

export const router = express.Router();

router.get("/", (req, res) => {
  let sql = "SELECT * FROM special";
  conn.query(sql, (err, result) => {
    if (err) throw err;
    res.status(200).json(result);
  });
});

router.post("/", (req, res) => {
  let specialArray: SpecialPost[] = req.body;
  specialArray.forEach((special) => {
    let sql = "INSERT INTO special (name) VALUES (?)";
    sql = mysql.format(sql, [special.name]);
    conn.query(sql, (err, result) => {
      if (err) throw err;
    });
  });
  res.status(201).json({ message: "insert success" });

});

router.get("/search/:name", (req, res) => {
  const name = req.params.name;

  let sql = "SELECT special_id FROM special WHERE name = ?";
  let formattedSql = mysql.format(sql, [name]);

  conn.query(formattedSql, (err, result) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err });
    }
    res.status(200).json(result);
  });
});


router.delete("/:id", (req, res) => {
  const id = req.params.id; // ✅ ควรใช้ req.params.id

  const sql = "DELETE FROM special WHERE special_id = ?";
  const formattedSql = mysql.format(sql, [id]);

  conn.query(formattedSql, (err, result) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err });
    }

    if (result.affectedRows === 0) {
      // ❌ ไม่มี row ไหนถูกลบ
      return res.status(404).json({ message: "ไม่พบข้อมูลที่จะลบ" });
    }

    // ✅ ลบสำเร็จ
    res.status(200).json({ message: "ลบข้อมูลเรียบร้อย", deletedId: id });
  });
});









