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

import { Request, Response } from "express";
import dayjs from "dayjs";
import { log } from "firebase-functions/logger";
const notifyDayOffsets = [3, 1];
const notifyWeekOffsets = [1];
const notifyMonthOffsets = [1];
const notifyOverdueOffsets = [1, 3, 7];
router.get("/notify/upcoming-vaccinations", async (req: Request, res: Response) => {
  try {
    const today = dayjs();

    const snapshot = await db.collection("reserve")
      .where("status", "==", 2)
      .get();

    for (const doc of snapshot.docs) {
      const data = doc.data();

      const appointmentDate = data.date?.toDate ? dayjs(data.date.toDate()) : dayjs(data.date);

      const daysLeft = appointmentDate.diff(today, "day");
      const weeksLeft = appointmentDate.diff(today, "week");
      const monthsLeft = appointmentDate.diff(today, "month");
      const daysOverdue = today.diff(appointmentDate, "day");

      const notifyMessages: string[] = [];

      if (notifyDayOffsets.includes(daysLeft)) {
        notifyMessages.push(`ล่วงหน้า ${daysLeft} วัน`);
      }
      if (notifyWeekOffsets.includes(weeksLeft) && daysLeft > 0) {
        notifyMessages.push(`ล่วงหน้า ${weeksLeft} สัปดาห์`);
      }
      if (notifyMonthOffsets.includes(monthsLeft) && daysLeft > 0) {
        notifyMessages.push(`ล่วงหน้า ${monthsLeft} เดือน`);
      }
      if (notifyOverdueOffsets.includes(daysOverdue) && today.isAfter(appointmentDate)) {
        notifyMessages.push(`พลาดนัดมาแล้ว ${daysOverdue} วัน`);
      }

      for (const whenText of notifyMessages) {
        // 1. บันทึกแจ้งเตือนไว้ใน Firestore
        const notifyDoc = {
          senderEmail: data.clinicEmail,
          receiverEmail: data.generalEmail,
          message: `📅 แจ้งเตือนนัดฉีดวัคซีน: คุณมีนัดฉีดวัคซีน ${whenText} (${appointmentDate.format("YYYY-MM-DD")})`,
          createAt: new Date(),
        };

        await db.collection("notify").add(notifyDoc);
        console.log(`✅ แจ้งเตือน ${whenText} ให้ ${data.generalEmail}`);

        // 2. ดึง fcmToken จาก MySQL
        const sql = mysql.format(
          "SELECT fcmToken FROM general WHERE user_email = ?",
          [data.generalEmail]
        );

        const results = await new Promise<any[]>((resolve, reject) => {
          conn.query(sql, (err, results) => {
            if (err) reject(err);
            else resolve(results);
          });
        });

        if (results && results.length > 0 && results[0].fcmToken) {
          const token = results[0].fcmToken;
          // ... ส่ง FCM ต่อ
        } else {
          console.log(`⚠️ ไม่พบ FCM Token สำหรับ ${data.generalEmail}`);
        }


        if (results && results.length > 0 && results[0].fcmToken) {
          const token = results[0].fcmToken;
          const title = "📅 แจ้งเตือนนัดฉีดวัคซีน";
          const body = `คุณมีนัดฉีดวัคซีน ${whenText} (${appointmentDate.format("YYYY-MM-DD")})`;

          // 3. ส่งแจ้งเตือนผ่าน FCM
          await sendFCMToken(token, title, body);
          console.log(`✅ ส่ง Push Notification ถึง ${data.generalEmail}`);
        } else {
          console.log(`⚠️ ไม่พบ FCM Token สำหรับ ${data.generalEmail}`);
        }
      }
    }

    res.status(200).json({ message: "Checked, notified and sent push notifications." });
  } catch (err) {
    console.error("❌ Error running checkUpcomingVaccinations:", err);
    res.status(500).json({ message: "Internal error", error: err });
  }
});




router.post("/notify/clinicrefuse/clinic-request", async (req, res) => {
  const { clinicEmail, generalEmail, userName, date } = req.body;
  const formattedTime = dayjs(date).format("HH:mm"); 

log("clinicEmail :" ,clinicEmail)
  // Get clinic FCM token test
  const sql = mysql.format("SELECT fcmToken FROM clinic WHERE user_email = ?", [
    clinicEmail,
  ]);
  conn.query(sql, async (err, results) => {
    if (err) return res.status(500).json({ message: "DB error", error: err });
    if (results.length === 0 || !results[0].fcmToken)
      return res.status(404).json({ message: "Clinic token not found" });

    const token = results[0].fcmToken;
    const title = `❌ คลินิก ${userName} ปฏิเสธคำขอฉีดวัคซีนของคุณ วันที่ ${formattedTime}`;
    const body = `คลินิกปฏิเสธคำขอฉีดวัคซีนของคุณ`;

    try {
      const message = await sendFCMToken(token, title, body);

      // 🔥 เพิ่มข้อมูลลง Firestore
      const notifyDoc = {
        senderEmail: generalEmail,
        receiverEmail: clinicEmail,
        message,
        createAt: new Date(),
      };

      await db.collection("generalNotifications").add(notifyDoc);
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

router.post("/notify/clinicaccept/clinic-request", async (req, res) => {
  const { clinicEmail, generalEmail, userName, date } = req.body;
  const formattedTime = dayjs(date).format("HH:mm"); 

log("clinicEmail :" ,clinicEmail)

  // Get clinic FCM token test
  const sql = mysql.format("SELECT fcmToken FROM clinic WHERE user_email = ?", [
    clinicEmail,
  ]);
  conn.query(sql, async (err, results) => {
    if (err) return res.status(500).json({ message: "DB error", error: err });
    if (results.length === 0 || !results[0].fcmToken)
      return res.status(404).json({ message: "Clinic token not found" });

    const token = results[0].fcmToken;
    const title = `📥 คลินิกตอบรับคำขอฉีดวัคซีนของคุณแล้ว วันที่ ${formattedTime}`;
    const body = `คลินิก: ${userName} ได้ตอบรับคำขอของคุณ`;

    try {
      const message = await sendFCMToken(token, title, body);

      // 🔥 เพิ่มข้อมูลลง Firestore
      const notifyDoc = {
        senderEmail: generalEmail,
        receiverEmail: clinicEmail,
        message,
        createAt: new Date(),
      };

      await db.collection("generalNotifications").add(notifyDoc);
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

      await db.collection("clinicNotifications").add(notifyDoc);
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

router.post("/notify/clinic-reject", async (req, res) => {
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
    const title = `❌ ยกเลิกวันจอง วันที่ ${date}`;
    const body = `ผู้จอง: ${userName} ยกเลิกวันจอง วันที่ ${date}`;

    try {
      const message = await sendFCMToken(token, title, body);

      // 🔥 เพิ่มข้อมูลลง Firestore
      const notifyDoc = {
        senderEmail: generalEmail,
        receiverEmail: clinicEmail,
        message,
        createAt: new Date(),
      };

      await db.collection("clinicNotifications").add(notifyDoc);
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
    const title = "📥 คลินิกได้ตอบรับคำขอจากคุณแล้ว";
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
    const title = "📥 คลินิกปฏิเสธคำขอของคุณ ขออภัยในความไม่สะดวก";
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
