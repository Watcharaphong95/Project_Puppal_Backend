import express from "express";
import { conn } from "../dbconnect";
import mysql from "mysql";
import { ClinicinjectionRecordPost } from "../model/clinicinjectionRecordPost";

export const router = express.Router();

router.get("/",(req,res)=>{
    let sql = "SELECT * FROM injectionRecord";
  conn.query(sql, (err, result) => {
    if (err) throw err;
    res.status(200).json(result);
  });
})

// router.post("/", (req, res) => {
//   const input: ClinicinjectionRecordPost = req.body;

//   const sql = `
//     INSERT INTO injectionRecord 
//     (dog_Id, reserveID, vaccine, date, vaccine_label) 
//     VALUES (?, ?, ?, ?, ?)
//   `;

//   const values = [
//     input.dog_Id,
//     input.reserveID,
//     input.vaccine,
//     input.date,
//     input.vaccine_label,
//   ];

//   conn.query(sql, values, (err, result) => {
//     if (err) {
//       console.error("Insert error:", err);
//       return res.status(500).json({ message: "เกิดข้อผิดพลาด", error: err });
//     }
//     res.status(201).json({ message: "insert success", id: result.insertId });
//   });
// });

// router.post("/", (req, res) => {
//   console.log("Received body:", req.body);
  

//   const input = req.body[0]; // เพราะรับเป็น list

//   // map fields ตามที่รับจริง
//   const values = [
//     input.dog_Id,
//     input.reserveID,
//     input.vaccine,
//     input.date,
//     input.vaccine_label,
//   ];

//   const sql = `
//     INSERT INTO injectionRecord 
//     (dog_Id, reserveID, vaccine, \`date\`, vaccine_label) 
//     VALUES (?, ?, ?, ?, ?)
//   `;

//   conn.query(sql, values, (err, result) => {
//     if (err) {
//       console.error("Insert error:", err);
//       return res.status(500).json({ message: "เกิดข้อผิดพลาด", error: err });
//     }
//     res.status(201).json({ message: "insert success", id: result.insertId });
//   });
// });

router.post("/", (req, res) => {
  let app: ClinicinjectionRecordPost = req.body;
  let dateTemp = new Date(app.date);

  const year = dateTemp.getFullYear();
  const month = String(dateTemp.getMonth() + 1).padStart(2, "0");
  const day = String(dateTemp.getDate()).padStart(2, "0");
  const formattedDate = `${year}-${month}-${day}`;

  let sql =
    "INSERT INTO injectionRecord (reserveID, appointment_aid, vaccine, date, vaccine_label) VALUES (?, ?, ?, ?, ?)";
  
  sql = mysql.format(sql, [
    app.reserveID,
    app.appointment_aid,
    app.vaccine,
    formattedDate,      
    app.vaccine_label,   
  ]);
  conn.query(sql, (err, result) => {
    if (err) {
      res.status(404).json({ message: err.sqlMessage });
    } else {
      res.status(201).json({ aid: result.insertId }); 

    }
  });
});

router.get("/:reserveID", (req, res) => {
  const reserveID = req.params.reserveID;

  const sql = `
    SELECT * FROM injectionRecord WHERE reserveID = ?
  `;

  conn.query(mysql.format(sql, [reserveID]), (err, result) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err });
    }

    if (result.length === 0) {
      return res.status(404).json({ message: "No injection records found" });
    }

    res.status(200).json({ data: result });
  });
});




