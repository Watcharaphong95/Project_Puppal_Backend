import express from "express";
import { conn } from "../dbconnect";
import mysql from "mysql";
import { ReservePost } from "../model/reservePost";

export const router = express.Router();

router.get("/", (req, res) => {
  let sql = "SELECT * FROM reserve";
  conn.query(sql, (err, result) => {
    if (err) throw err;
    res.status(200).json(result);
  });
});

router.get("/:email", (req, res) => {
  let email = req.params.email;

  let sql = `
  SELECT reserve.*, general.username, general.phone
  FROM reserve
  JOIN general ON reserve.general_email = general.user_email
  WHERE reserve.clinic_email = ?
  ORDER BY reserve.date DESC
`;
  sql = mysql.format(sql, [email]);

  conn.query(sql, (err, result) => {
    if (err) throw err;
    res.status(200).json(result);
  });
});

router.get("/search_id/:id", (req, res) => {
  let id = req.params.id;

  let sql = `
    SELECT 
      reserve.*, 
      general.username, 
      general.phone,
      dog.name,
      dog.breed,
      dog.gender,
      dog.color,
      dog.defect,
      dog.birthday,
      dog.congentialDisease,
      dog.sterilization,
      dog.Hair,
      dog.image
    FROM reserve
    JOIN general ON reserve.general_email = general.user_email
    JOIN dog ON reserve.dog_dogId = dog.dogId
    WHERE reserve.reserveID = ?
    ORDER BY reserve.date DESC
  `;

  sql = mysql.format(sql, [id]);

  conn.query(sql, (err, result) => {
    if (err) throw err;
    res.status(200).json(result);
  });
});

router.put("/:reserveID",(req,res)=>{
  let reserveID = req.params.reserveID
    let data: ReservePost = req.body;
  let sql = "UPDATE reserve SET status = ? WHERE reserveID = ?"
  sql = mysql.format(sql,[
    data.status,
    reserveID])
 conn.query(sql, (err, result) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err });
    }
    console.log("Affected rows:", result.affectedRows);

    res.status(200).json({ message: "Profile updated successfully" });
  });
})

router.get("/group/:id", (req, res) => {
  let id = req.params.id;

  let sql = `
    SELECT 
      reserve.*, 
      general.*,
      dog.*
    FROM reserve
    JOIN general ON reserve.general_email = general.user_email
    JOIN dog ON reserve.dog_dogId = dog.dogId
    WHERE reserve.reserveID = ?
    ORDER BY reserve.date DESC
  `;
  interface ReserveRow {
  date: string;
  clinic_email: string;
  username: string;
  phone: string;
  name: string; // dog.name
  breed: string;
  gender: string;
  color: string;
  defect: string;
  birthday: string;
  congentialDisease: string;
  sterilization: string;
  Hair: string;
  image: string;
  // เพิ่ม field อื่น ๆ จาก SELECT ของคุณ เช่น reserveID, dog_dogId, status, type, message ฯลฯ
}

  sql = mysql.format(sql, [id]);

  conn.query(sql, (err, results) => {
    if (err) throw err;

    // 🧠 Group by date (only date part) and clinic_email
    const grouped: { [key: string]: ReserveRow[] } = {};

    results.forEach((row : any) => {
      const dateOnly = new Date(row.date).toISOString().split("T")[0]; // yyyy-mm-dd
      const key = `${dateOnly}_${row.clinic_email}`;

      if (!grouped[key]) {
        grouped[key] = [];
      }

      grouped[key].push(row);
    });

    // ส่งออกแบบ object ของกลุ่ม
    res.status(200).json(grouped);
  });
});


