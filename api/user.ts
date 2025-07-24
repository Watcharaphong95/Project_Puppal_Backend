import express from "express";
import { conn } from "../dbconnect";
import { UserData } from "../model/userPost";
import mysql from "mysql";
import { log } from "console";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import { OtpPost } from "../model/otpPost";
import { FcmTokenPost } from "../model/fcmTokenPost";

export const router = express.Router();

router.get("/", (req, res) => {
  let sql = "SELECT * FROM user";
  conn.query(sql, (err, result) => {
    if (err) throw err;
    res.status(200).json(result);
  });
});

router.get("/:email", (req, res) => {
  let email = req.params.email;
  let sql = "SELECT email, general, clinic FROM user WHERE email = ?";
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

router.get("/google/:email", (req, res) => {
  let email = req.params.email;
  let sql =
    "SELECT email, general, clinic FROM user WHERE email = ? AND password IS NULL";
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

router.get("/checkpass/:email", (req, res) => {
  let email = req.params.email;
  let sql = "SELECT password FROM user WHERE email = ?";
  sql = mysql.format(sql, [email]);
  conn.query(sql, (err, result) => {
    if (err) throw err;
    if (result.length > 0) {
      if (result[0].password != null) {
        res.status(200).json({ message: "User valid" });
      } else {
        res.status(400).json({ message: "User use google to register" });
      }
    } else {
      res.status(404).json({ message: "User not found" });
    }
  });
});

router.post("/", (req, res) => {
  let user: UserData = req.body;
  const password = user.password === "" ? null : user.password;
  let sql =
    "INSERT INTO user (email, password, general, clinic) VALUES (?, ?, ?, ?)";
  sql = mysql.format(sql, [user.email, password, user.general, user.clinic]);

  conn.query(sql, (err, result) => {
    if (err) throw err;
    res.status(201).json({ message: "insert success" });
  });
});

router.post("/login", (req, res) => {
  let user: UserData = req.body;
  let sql = "SELECT * FROM user WHERE email = ? AND password = ?";
  sql = mysql.format(sql, [user.email, user.password]);
  conn.query(sql, (err, result) => {
    if (err) throw err;
    if (result.length > 0) {
      res.status(200).json(result[0]);
    } else {
      res.status(404).json({ message: "User not found" });
    }
  });
});

router.put("/deleteGeneral/:email", (req, res) => {
  let email = req.params.email;
  let sql = "UPDATE user SET general = ? WHERE email = ?";
  sql = mysql.format(sql, [null, email]);
  conn.query(sql, (err, result) => {
    if (err) throw err;
    res.status(200).json({ message: "general type Update Success" });
  });
});

router.delete("/:email", (req, res) => {
  let email = req.params.email;
  let sql = "DELETE FROM user WHERE user_email = ?";
  sql = mysql.format(sql, [email]);

  conn.query(sql, (err, result) => {
    if (err) throw err;
    res.status(200).json({ message: "delete success" });
  });
});

router.put("/password", (req, res) => {
  let user: UserData = req.body;
  log(user.email);
  let sql = "UPDATE user SET password = ? WHERE email = ?";
  sql = mysql.format(sql, [user.password, user.email]);
  conn.query(sql, (err, result) => {
    if (err) throw err;
    res.status(200).json({ message: "Password Update Success" });
  });
});

router.put("/fcmToken", (req, res) => {
  const dataToken: FcmTokenPost = req.body;
  const email = dataToken.user_email;
  const token = dataToken.fcmToken;

  const checkGeneralSQL = mysql.format(
    "SELECT 1 FROM general WHERE user_email = ? LIMIT 1",
    [email]
  );
  const checkClinicSQL = mysql.format(
    "SELECT 1 FROM clinic WHERE user_email = ? LIMIT 1",
    [email]
  );

  // Check both tables first
  conn.query(checkGeneralSQL, (err, generalResult) => {
    if (err) return res.status(500).json({ message: "Error checking general", error: err });

    conn.query(checkClinicSQL, (err, clinicResult) => {
      if (err) return res.status(500).json({ message: "Error checking clinic", error: err });

      const updateQueries: string[] = [];

      if (generalResult.length > 0) {
        updateQueries.push(mysql.format(
          "UPDATE general SET fcmToken = ? WHERE user_email = ?",
          [token, email]
        ));
      }

      if (clinicResult.length > 0) {
        updateQueries.push(mysql.format(
          "UPDATE clinic SET fcmToken = ? WHERE user_email = ?",
          [token, email]
        ));
      }

      if (updateQueries.length === 0) {
        return res.status(404).json({ message: "User email not found in general or clinic" });
      }

      let completed = 0;
      for (let i = 0; i < updateQueries.length; i++) {
        conn.query(updateQueries[i], (err) => {
          if (err) return res.status(500).json({ message: "Error updating token", error: err });

          completed++;
          if (completed === updateQueries.length) {
            return res.status(201).json({ message: "FCM token updated successfully" });
          }
        });
      }
    });
  });
});


router.get("/sendotp/:email", async (req, res) => {
  const email = req.params.email;

  function generateOTP(length = 6) {
    const digits = "0123456789";
    let otp = "";
    for (let i = 0; i < length; i++) {
      otp += digits[Math.floor(Math.random() * 10)];
    }
    return otp;
  }

  const otp = generateOTP();

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "65011212077@msu.ac.th",
        pass: "pgwv rimh zsye nnpk",
      },
    });

    const mailOptions = {
  from: `"PUPPAL" <65011212077@msu.ac.th>`,
  to: email,
  subject: "🔐 รหัสยืนยันตัวตน (OTP) ของคุณ",
  html: `
    <div style="font-family: 'Sarabun', Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; background-color: #fdfaf7;">
      <h2 style="color: #916B44; text-align: center;">🐶 รีเซ็ตรหัสผ่าน PUPPAL</h2>
      <p style="font-size: 16px; color: #333;">รหัสยืนยันตัวตนสำหรับเปลี่ยนรหัสผ่าน (OTP) ของคุณคือ</p>
      <div style="text-align: center; margin: 20px 0;">
        <span style="font-size: 28px; font-weight: bold; color: #916B44; background-color: #fff; padding: 10px 20px; border: 2px dashed #916B44; border-radius: 8px;">
          ${otp}
        </span>
      </div>
      <p style="font-size: 14px; color: #777;">รหัสนี้จะหมดอายุภายใน 5 นาที กรุณาอย่าเปิดเผยรหัสนี้ให้ผู้อื่นทราบ</p>
      <p style="font-size: 14px; color: #777;">หากคุณไม่ได้ร้องขอรหัสนี้ กรุณาละเว้นอีเมลฉบับนี้</p>
      <hr style="border: none; border-top: 1px solid #eee;" />
      <p style="text-align: center; font-size: 12px; color: #aaa;">&copy; 2025 ทีมงาน PUPPAL</p>
    </div>
  `,
};



    await transporter.sendMail(mailOptions);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    let sql =
      "INSERT INTO otp (user_email, otp , expire) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE otp = VALUES(otp), expire = VALUES(expire)";
    sql = mysql.format(sql, [email, otp, expiresAt]);
    conn.query(sql, (err, result) => {
      if (err) throw err;
      res.status(200).json({ message: "OTP sent successfully" });
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to send OTP" });
  }
});

router.post("/verifyotp", (req, res) => {
  let checkOtp: OtpPost = req.body;
  let sql = "SELECT * FROM otp WHERE user_email = ?";
  sql = mysql.format(sql, [checkOtp.user_email]);
  conn.query(sql, (err, result) => {
    if (err) throw err;
    let trueOtp: OtpPost = result[0];
    if (
      checkOtp.otp == trueOtp.otp &&
      new Date(trueOtp.expire) > new Date(checkOtp.expire)
    ) {
      let sql2 = "DELETE FROM otp WHERE user_email = ?";
      sql2 = mysql.format(sql2, [checkOtp.user_email]);
      conn.query(sql2, (err, result) => {
        if (err) throw err;
        res.status(200).json({ message: "OTP verify success" });
      });
    } else {
      res.status(400).json({ message: "OTP verify failed" });
    }
  });
});
