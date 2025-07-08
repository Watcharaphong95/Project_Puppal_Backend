import express from "express";
import { conn } from "../dbconnect";
import mysql from "mysql";
import { AppointmentPost } from "../model/appointmentPost";

export const router = express.Router();

router.get("/", (req, res) => {
  let sql = "SELECT * FROM appointment";
  conn.query(sql, (err: any, result: any[]) => {
    if (err) throw err;
    if (result.length > 0) {
      const adjusted = result.map((row) => {
        return {
          ...row,
          date: new Date(row.date).toLocaleString("sv-SE", {
            timeZone: "Asia/Bangkok",
          }),
        };
      });
      res.status(200).json(adjusted);
    } else {
      res.status(404).json({ message: "No data" });
    }
  });
});


router.post("/", (req, res) => {
  let app: AppointmentPost = req.body;
  let dateTemp = new Date(app.date);
  dateTemp.setMonth(dateTemp.getMonth() + app.month);

  const year = dateTemp.getFullYear();
  const month = String(dateTemp.getMonth() + 1).padStart(2, "0");
  const day = String(dateTemp.getDate()).padStart(2, "0");
  const formattedDate = `${year}-${month}-${day}`;

  let sql =
    "INSERT INTO appointment (dogId, general_user_email, vaccine, date) VALUES (?,?,?,?)";
  sql = mysql.format(sql, [
    app.dogId,
    app.general_user_email,
    app.vaccine,
    formattedDate,
  ]);

  conn.query(sql, (err, result) => {
    if (err) {
      res.status(404).json({ message: err.sqlMessage });
    } else {
      res.status(201).json({ insertId: result.insertId });
    }
  });
});

router.put("/:aid", (req, res) => {
  let aid = req.params.aid;
  let sql = "UPDATE appointment SET status = ? WHERE aid = ?"
  sql = mysql.format(sql, [1, aid])
  conn.query(sql, (err, result) => {
    if (err) {
      res.status(404).json({ message: err.sqlMessage });
    } else {
      res.status(201).json({ affected_Rows: result.affectedRows });
    }
  });
})