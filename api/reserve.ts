import express from "express";
import { conn } from "../dbconnect";
import mysql from "mysql";
import { ClinicSlotReq } from "../model/clinicSlotReq";
import { json } from "body-parser";
import { ReservePost } from "../model/reservePost";
import { ClinicUpdateTypePost } from "../model/clinicUpdateTypePost";
import { ClinicSlotPost } from "../model/clinicSlotPost";
import { ClinicSlotGet } from "../model/clinicSlotGet";
import { ReserveSpecialCheckPost } from "../model/reserveSpecialCheckPost";
import { ReserveDoglist } from "../model/reserveDoglist";
import { sendFCMToken } from "../firebaseNotification";
import { db } from "../firebaseconnect";

export const router = express.Router();



router.post("/notify/clinic-request", async (req, res) => {
  const { clinicEmail, generalEmail, userName, date } = req.body;

  // Get clinic FCM token test
  const sql = mysql.format("SELECT fcmToken FROM clinic WHERE user_email = ?", [
    clinicEmail,
  ]);
  conn.query(sql, async (err, results) => {
    if (err) return res.status(500).json({ message: "DB error", error: err });
    if (results.length === 0 || !results[0].fcmToken)
      return res.status(404).json({ message: "Clinic token not found" });

    const token = results[0].fcmToken;
    const title = `📥 มีคำขอฉีดยาใหม่ วันที่ ${date}`;
    const body = `ผู้จอง: ${userName}`;

    try {
      const message = await sendFCMToken(token, title, body);

      // 🔥 เพิ่มข้อมูลลง Firestore
      const notifyDoc = {
        senderEmail: generalEmail,
        receiverEmail: clinicEmail,
        message,
        createAt: new Date(),
      };

      await db.collection("notify").add(notifyDoc);
      res
        .status(200)
        .json({ message: "Notification sent and Firestore saved" });
    } catch (error) {
      console.error("Error sending notification or saving Firestore:", error);
      res
        .status(500)
        .json({ message: "Notification or Firestore error", error });
    }
  });
});

router.post("/notify/general-reponse", async (req, res) => {
  const { generalEmail, userName } = req.body;

  // Get clinic FCM token
  const sql = mysql.format(
    "SELECT fcmToken FROM general WHERE user_email = ?",
    [generalEmail]
  );
  conn.query(sql, async (err, results) => {
    if (err) return res.status(500).json({ message: "DB error", error: err });
    if (results.length === 0 || !results[0].fcmToken)
      return res.status(404).json({ message: "Clinic token not found" });

    const token = results[0].fcmToken;
    const title = "📥 Your Request has been accept";
    const body = `From: ${userName}`;

    await sendFCMToken(token, title, body);
    res.status(200).json({ message: "Notification sent to general" });
  });
});

router.post("/notify/accept/general-reponse", async (req, res) => {
  const { generalEmail, userName } = req.body;

  // Get clinic FCM token
  const sql = mysql.format(
    "SELECT fcmToken FROM general WHERE user_email = ?",
    [generalEmail]
  );
  conn.query(sql, async (err, results) => {
    if (err) return res.status(500).json({ message: "DB error", error: err });
    if (results.length === 0 || !results[0].fcmToken)
      return res.status(404).json({ message: "Clinic token not found" });

    const token = results[0].fcmToken;
    const title = "📥 กูรับฉีดยาหมามึงแล้ว";
    const body = `From: ${userName}`;

    await sendFCMToken(token, title, body);
    res.status(200).json({ message: "Notification sent to general" });
  });
});

router.post("/notify/refuse/general-reponse", async (req, res) => {
  const { generalEmail, userName } = req.body;

  // Get clinic FCM token
  const sql = mysql.format(
    "SELECT fcmToken FROM general WHERE user_email = ?",
    [generalEmail]
  );
  conn.query(sql, async (err, results) => {
    if (err) return res.status(500).json({ message: "DB error", error: err });
    if (results.length === 0 || !results[0].fcmToken)
      return res.status(404).json({ message: "Clinic token not found" });

    const token = results[0].fcmToken;
    const title = "📥 กูไม่รับฉีดยาหมามึงไอ้สัส";
    const body = `From: ${userName}`;

    await sendFCMToken(token, title, body);
    res.status(200).json({ message: "Notification sent to general" });
  });
});

function generateTimeSlots(
  open: string,
  close: string,
  gapMinutes: number,
  filledSlots: string[] = []
): string[] {
  const slots: string[] = [];

  const [openHour, openMinute] = open.split(":").map(Number);
  const [closeHour, closeMinute] = close.split(":").map(Number);

  let current = new Date(0, 0, 0, openHour, openMinute);
  const end = new Date(0, 0, 0, closeHour, closeMinute);

  const breakStart = new Date(0, 0, 0, 12, 0);
  const breakEnd = new Date(0, 0, 0, 13, 0);

  while (current < end) {
    if (current >= breakStart && current < breakEnd) {
      current = breakEnd;
      continue;
    }

    const timeStr = current.toTimeString().slice(0, 5); // "HH:MM"

    if (!filledSlots.includes(timeStr)) {
      slots.push(timeStr);
    }

    current = new Date(current.getTime() + gapMinutes * 60000);
  }

  return slots;
}
