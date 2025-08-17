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

import { log } from "firebase-functions/logger";
import dayjs from "dayjs";

require("dayjs/locale/th"); // โหลด locale ภาษาไทย
dayjs.locale("th");

//ลบข้อมูลที่เลยวันฉีดยา
const admin = require("firebase-admin");
if (!admin.apps.length) {
  admin.initializeApp();
}

const Database = admin.firestore();

// API: GET /delete-expired-reserves
router.get("/delete-expired-reserves", async (req: Request, res: Response) => {
  try {
    const now = new Date().toLocaleString("sv-SE", {
            timeZone: "Asia/Bangkok",
          });
    console.log(now);
    
    const reserveRef = Database.collection("reserve");
    const snapshot = await reserveRef.get();

    let deleteCount = 0;

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const status = data.status;
      const date =data.date; // ensure `data.date` is a parseable format

      if ((status === 1 || status === 2) && date < now) {
        log(`🗑️ Deleting expired reservation: ${doc.id} | status: ${status} | date: ${date}`);
        await reserveRef.doc(doc.id).delete();
        deleteCount++;
      }
    }

    log(`✅ Finished deleting ${deleteCount} expired reservation(s).`);
    res.status(200).json({
      message: `Deleted ${deleteCount} expired reservation(s).`,
      deleted: deleteCount,
    });
  } catch (error: any) {
    log("❌ Error deleting expired reservations", error);
    res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
});




router.get("/notify/upcoming-vaccinations", async (req: Request, res: Response) => {
  try {
    console.log(`🔄 Starting vaccination notification check at ${new Date().toISOString()}`);
    
    const today = dayjs();
    let processedCount = 0;
    let notificationsSent = 0;
    let errors = 0;

    // Get all confirmed appointments (status = 2)
    const snapshot = await db.collection("reserve")
      .where("status", "==", 2)
      .get();

    console.log(`📊 Found ${snapshot.docs.length} confirmed appointments to check`);

    // Process each appointment
    for (const doc of snapshot.docs) {
      try {
        const data = doc.data() as AppointmentData;
        
        if (!data.clinicEmail) {
          console.warn(`⚠️ Missing clinicEmail for appointment ${doc.id}`);
          continue;
        }

        await processAppointmentNotifications(doc.id, data, today);
        processedCount++;
        
      } catch (error) {
        console.error(`❌ Error processing appointment ${doc.id}:`, error);
        errors++;
      }
    }

    const summary = {
      message: "Vaccination notification check completed",
      timestamp: new Date().toISOString(),
      stats: {
        totalAppointments: snapshot.docs.length,
        processed: processedCount,
        errors: errors
      }
    };

    console.log(`✅ Notification check completed:`, summary);
    res.status(200).json(summary);

  } catch (error) {
    console.error("❌ Critical error in vaccination notification system:", error);
    res.status(500).json({ 
      message: "Internal server error", 
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

router.post("/notify/injectioncompleted/clinic-request", async (req, res) => {
  const { clinicEmail, generalEmail, userName, date } = req.body;

  try {
    const weekday = dayjs(date).format("dddd");
    const day = dayjs(date).format("D");
    const month = dayjs(date).format("MMMM");
    const year = dayjs(date).year() + 543;
    const time = dayjs(date).format("HH:mm");
    const thaiFullDate = `${weekday}ที่ ${day} ${month} ${year} เวลา ${time} น.`;

    console.log("clinicEmail :", clinicEmail);

    const sql = mysql.format(
      "SELECT fcmToken FROM general WHERE user_email = ?",
      [generalEmail]
    );

    conn.query(sql, async (err, results) => {
      if (err)
        return res.status(500).json({ message: "DB error", error: err });
      if (results.length === 0 || !results[0].fcmToken)
        return res.status(404).json({ message: "Clinic token not found" });

      const token = results[0].fcmToken;

      const title = `✅ คลินิก ${userName} ทำการฉีดวัคซีนให้กับสุนัขของคุณเรียบร้อยแล้ว วันที่ ${thaiFullDate} ขอบคุณที่เข้ามาใช้บริการกับเรา ครับ/ค่ะ`;
      const body = `คลินิก ${userName} ฉีดวัคซีนให้กับสุนัขของคุณเรียบร้อยแล้ว`;

      try {
        const message = await sendFCMToken(token, title, body);

        const notifyDoc = {
          senderEmail: clinicEmail,
          receiverEmail: generalEmail,
          message,
          createAt: new Date(),
        };

        await db.collection("generalNotifications").add(notifyDoc);

        res.status(200).json({
          message: "Notification sent and Firestore saved",
        });
      } catch (error) {
        console.error("Error sending notification or saving Firestore:", error);
        res.status(500).json({
          message: "Notification or Firestore error",
          error,
        });
      }
    });
  } catch (e) {
    console.error("❌ Error formatting date:", e);
    res.status(400).json({ message: "Invalid date format", error: e });
  }
});

router.post("/notify/clinicrefuse/clinic-request", async (req, res) => {
  const { clinicEmail, generalEmail, userName, date } = req.body;

  try {
    const weekday = dayjs(date).format("dddd");
    const day = dayjs(date).format("D");
    const month = dayjs(date).format("MMMM");
    const year = dayjs(date).year() + 543;
    const time = dayjs(date).format("HH:mm");
    const thaiFullDate = `${weekday}ที่ ${day} ${month} ${year} เวลา ${time} น.`;

    console.log("clinicEmail :", clinicEmail);

    const sql = mysql.format(
      "SELECT fcmToken FROM general WHERE user_email = ?",
      [generalEmail]
    );

    conn.query(sql, async (err, results) => {
      if (err)
        return res.status(500).json({ message: "DB error", error: err });
      if (results.length === 0 || !results[0].fcmToken)
        return res.status(404).json({ message: "Clinic token not found" });

      const token = results[0].fcmToken;

      const title = `❌ คลินิก ${userName} ปฏิเสธคำขอฉีดวัคซีนของคุณ วันที่ ${thaiFullDate}`;
      const body = `คลินิก ${userName} ปฏิเสธคำขอฉีดวัคซีนของคุณ`;

      try {
        const message = await sendFCMToken(token, title, body);

        const notifyDoc = {
          senderEmail: clinicEmail,
          receiverEmail: generalEmail,
          message,
          createAt: new Date(),
        };

        await db.collection("generalNotifications").add(notifyDoc);

        res.status(200).json({
          message: "Notification sent and Firestore saved",
        });
      } catch (error) {
        console.error("Error sending notification or saving Firestore:", error);
        res.status(500).json({
          message: "Notification or Firestore error",
          error,
        });
      }
    });
  } catch (e) {
    console.error("❌ Error formatting date:", e);
    res.status(400).json({ message: "Invalid date format", error: e });
  }
});

router.post("/notify/cliniccancle/clinic-request", async (req, res) => {
  const { clinicEmail, generalEmail, userName, date } = req.body;

  try {
    const weekday = dayjs(date).format("dddd");
    const day = dayjs(date).format("D");
    const month = dayjs(date).format("MMMM");
    const year = dayjs(date).year() + 543;
    const time = dayjs(date).format("HH:mm");
    const thaiFullDate = `${weekday}ที่ ${day} ${month} ${year} เวลา ${time} น.`;

    console.log("clinicEmail :", clinicEmail);

    const sql = mysql.format(
      "SELECT fcmToken FROM general WHERE user_email = ?",
      [generalEmail]
    );

    conn.query(sql, async (err, results) => {
      if (err)
        return res.status(500).json({ message: "DB error", error: err });
      if (results.length === 0 || !results[0].fcmToken)
        return res.status(404).json({ message: "Clinic token not found" });

      const token = results[0].fcmToken;

      const title = `❌ คลินิก ${userName} ยกเลิกนัดฉีดวัคซีนของคุณ วันที่ ${thaiFullDate}`;
      const body = `คลินิก ${userName} ยกเลิกนัดฉีดวัคซีนของคุณ`;

      try {
        const message = await sendFCMToken(token, title, body);

        const notifyDoc = {
          senderEmail: clinicEmail,
          receiverEmail: generalEmail,
          message,
          createAt: new Date(),
        };

        await db.collection("generalNotifications").add(notifyDoc);

        res.status(200).json({
          message: "Notification sent and Firestore saved",
        });
      } catch (error) {
        console.error("Error sending notification or saving Firestore:", error);
        res.status(500).json({
          message: "Notification or Firestore error",
          error,
        });
      }
    });
  } catch (e) {
    console.error("❌ Error formatting date:", e);
    res.status(400).json({ message: "Invalid date format", error: e });
  }
});



router.post("/notify/clinicaccept/clinic-request", async (req, res) => {
  const { clinicEmail, generalEmail, userName, date } = req.body;

  // ✅ แปลงวันที่เป็นภาษาไทยแบบเต็ม
  try {
    const weekday = dayjs(date).format("dddd"); // วันในสัปดาห์ เช่น "วันพฤหัสบดี"
    const day = dayjs(date).format("D");
    const month = dayjs(date).format("MMMM"); // ชื่อเดือนเต็ม
    const year = dayjs(date).year() + 543; // แปลงปี ค.ศ. ➜ พ.ศ.
    const time = dayjs(date).format("HH:mm"); // เวลาแบบ 2 หลัก เช่น 09:30

    const thaiFullDate = `${weekday}ที่ ${day} ${month} ${year} เวลา ${time} น.`;

    console.log("clinicEmail :", clinicEmail);
    console.log("generalEmail :", generalEmail);
    console.log("thaiFullDate :", thaiFullDate);

    // ✅ ค้นหา FCM Token จากผู้ใช้งาน
    const sql = mysql.format(
      "SELECT fcmToken FROM general WHERE user_email = ?",
      [generalEmail]
    );

    conn.query(sql, async (err, results) => {
      if (err)
        return res.status(500).json({ message: "DB error", error: err });
      if (results.length === 0 || !results[0].fcmToken)
        return res.status(404).json({ message: "Clinic token not found" });

      const token = results[0].fcmToken;

      const title = `✅ คลินิก ${userName} ตอบรับคำขอฉีดวัคซีนของคุณแล้ว วันที่ ${thaiFullDate}`;
      const body = `คลินิก: ${userName} ได้ตอบรับคำขอของคุณ`;

      try {
        const message = await sendFCMToken(token, title, body);

        // 🔥 เพิ่มข้อมูลลง Firestore
        const notifyDoc = {
          senderEmail: clinicEmail,
          receiverEmail: generalEmail,
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
  } catch (e) {
    console.error("❌ Error formatting date:", e);
    res.status(400).json({ message: "Invalid date format", error: e });
  }
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
router.post("/notify/injectioncompleted/general-reponse", async (req, res) => {
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
    const title = "✅ สุนัขได้รับการฉีดวัคซันกับคลินิกเสร็จสิ้นแล้ว";
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
    const title = "✅ คลินิกได้ตอบรับคำขอจากคุณแล้ว";
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
    const title = "❌ คลินิกปฏิเสธคำขอของคุณ ขออภัยในความไม่สะดวก";
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

// Configuration for notification intervals
const NOTIFICATION_CONFIG = {
  dayOffsets: [1, 2, 3],
  weekOffsets: [1, 2], 
  monthOffsets: [1, 3],
  overdueOffsets: [1, 3, 7, 14] // Added 14 days for extended overdue tracking
};

interface NotificationData {
  senderEmail: string;
  receiverEmail: string;
  message: string;
  createAt: Date;
  appointmentId: string;
  notificationType: 'upcoming' | 'overdue';
  offsetValue: number;
  offsetUnit: 'day' | 'week' | 'month';
}

interface AppointmentData {
  clinicEmail: string;
  generalEmail: string;
  date: any;
  patientName?: string;
  vaccineType?: string;
  [key: string]: any;
}

// Thai month names
const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

// Thai day names
const THAI_DAYS = [
  'อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'
];

/**
 * Format date to Thai format
 */
const formatThaiDate = (date: dayjs.Dayjs): string => {
  const day = date.date();
  const month = THAI_MONTHS[date.month()];
  const year = date.year() + 543; // Convert to Buddhist year
  const dayName = THAI_DAYS[date.day()];
  const time = date.format("HH:mm");
  
  return `วัน${dayName}ที่ ${day} ${month} ${year} เวลา ${time} น.`;
};

/**
 * Create notification message based on type and timing
 */
const createNotificationMessage = (
  type: 'day' | 'week' | 'month' | 'overdue',
  value: number,
  appointmentDate: dayjs.Dayjs,
  data: AppointmentData
): string => {
  const thaiDateStr = formatThaiDate(appointmentDate);
  
  switch (type) {
    case 'day':
      return `📅 แจ้งเตือนนัดฉีดวัคซีน: คุณมีนัดฉีดวัคซีนในอีก ${value} วัน (${thaiDateStr})`;
    case 'week':
      return `📅 แจ้งเตือนนัดฉีดวัคซีน: คุณมีนัดฉีดวัคซีนในอีก ${value} สัปดาห์ (${thaiDateStr})`;
    case 'month':
      return `📅 แจ้งเตือนนัดฉีดวัคซีน: คุณมีนัดฉีดวัคซีนในอีก ${value} เดือน (${thaiDateStr})`;
    case 'overdue':
      return `⚠️ แจ้งเตือนนัดที่พลาด: คุณพลาดนัดฉีดวัคซีนมาแล้ว ${value} วัน (${thaiDateStr}) โปรดติดต่อคลินิกเพื่อนัดหมายใหม่`;
    default:
      return `📅 แจ้งเตือนนัดฉีดวัคซีน (${thaiDateStr})`;
  }
};

/**
 * Save notification to Firestore
 */
const saveNotification = async (notificationData: NotificationData): Promise<void> => {
  try {
    await db.collection("clinicNotifications").add(notificationData);
    console.log(`✅ บันทึกแจ้งเตือนสำเร็จ: ${notificationData.receiverEmail}`);
  } catch (error) {
    console.error(`❌ ไม่สามารถบันทึกแจ้งเตือนได้:`, error);
    throw error;
  }
};

/**
 * Get FCM token from MySQL
 */
const getFCMToken = async (email: string): Promise<string | null> => {
  return new Promise((resolve, reject) => {
    const sql = mysql.format(
      "SELECT fcmToken FROM clinic WHERE user_email = ? AND fcmToken IS NOT NULL AND fcmToken != ''",
      [email]
    );

    conn.query(sql, (err: any, results: any[]) => {
      if (err) {
        console.error(`❌ Database error for ${email}:`, err);
        reject(err);
      } else if (results && results.length > 0 && results[0].fcmToken) {
        resolve(results[0].fcmToken);
      } else {
        resolve(null);
      }
    });
  });
};

/**
 * Send push notification via FCM
 */
const sendPushNotification = async (
  token: string, 
  title: string, 
  body: string, 
  email: string
): Promise<void> => {
  try {
    await sendFCMToken(token, title, body);
    console.log(`✅ ส่ง Push Notification สำเร็จ: ${email}`);
  } catch (error) {
    console.error(`❌ ไม่สามารถส่ง Push Notification ได้ (${email}):`, error);
    // Don't throw error, just log it - notification failure shouldn't stop the process
  }
};

/**
 * Process notifications for a single appointment
 */
const processAppointmentNotifications = async (
  appointmentId: string,
  data: AppointmentData,
  today: dayjs.Dayjs
): Promise<void> => {
  const appointmentDate = data.date?.toDate ? dayjs(data.date.toDate()) : dayjs(data.date);
  
  if (!appointmentDate.isValid()) {
    console.warn(`⚠️ Invalid appointment date for ${appointmentId}`);
    return;
  }

  const daysLeft = appointmentDate.diff(today, "day");
  const weeksLeft = appointmentDate.diff(today, "week");
  const monthsLeft = appointmentDate.diff(today, "month");
  const daysOverdue = today.diff(appointmentDate, "day");

  const notifications: Array<{
    type: 'day' | 'week' | 'month' | 'overdue';
    value: number;
    message: string;
    notificationType: 'upcoming' | 'overdue';
  }> = [];

  // Check for upcoming notifications (prioritize longer periods first to avoid conflicts)
  
  // Check months first (only if more than 4 weeks away to avoid overlap)
  if (NOTIFICATION_CONFIG.monthOffsets.includes(monthsLeft) && daysLeft >= 28) {
    notifications.push({
      type: 'month',
      value: monthsLeft,
      message: createNotificationMessage('month', monthsLeft, appointmentDate, data),
      notificationType: 'upcoming'
    });
  }
  // Check weeks (only if not already notified for months and more than 6 days away)
  else if (NOTIFICATION_CONFIG.weekOffsets.includes(weeksLeft) && daysLeft >= 7 && daysLeft < 28) {
    notifications.push({
      type: 'week',
      value: weeksLeft,
      message: createNotificationMessage('week', weeksLeft, appointmentDate, data),
      notificationType: 'upcoming'
    });
  }
  // Check days (only if less than a week away)
  else if (NOTIFICATION_CONFIG.dayOffsets.includes(daysLeft) && daysLeft > 0 && daysLeft < 7) {
    notifications.push({
      type: 'day',
      value: daysLeft,
      message: createNotificationMessage('day', daysLeft, appointmentDate, data),
      notificationType: 'upcoming'
    });
  }

  // Check for overdue notifications
  if (NOTIFICATION_CONFIG.overdueOffsets.includes(daysOverdue) && today.isAfter(appointmentDate)) {
    notifications.push({
      type: 'overdue',
      value: daysOverdue,
      message: createNotificationMessage('overdue', daysOverdue, appointmentDate, data),
      notificationType: 'overdue'
    });
  }

  // Process each notification
  for (const notification of notifications) {
    try {
      // 1. Save notification to Firestore
      const notificationData: NotificationData = {
        senderEmail: 'system',
        receiverEmail: data.clinicEmail,
        message: notification.message,
        createAt: new Date(),
        appointmentId,
        notificationType: notification.notificationType,
        offsetValue: notification.value,
        offsetUnit: notification.type === 'overdue' ? 'day' : notification.type
      };

      await saveNotification(notificationData);

      // 2. Get FCM token and send push notification
      const fcmToken = await getFCMToken(data.clinicEmail);
      
      if (fcmToken) {
        const title = notification.notificationType === 'overdue' 
          ? "⚠️ แจ้งเตือนนัดที่พลาด" 
          : "📅 แจ้งเตือนนัดฉีดวัคซีน";
        
        await sendPushNotification(fcmToken, title, notification.message, data.clinicEmail);
      } else {
        console.log(`⚠️ ไม่พบ FCM Token สำหรับ ${data.clinicEmail}`);
      }

    } catch (error) {
      console.error(`❌ Error processing notification for ${appointmentId}:`, error);
      // Continue with other notifications even if one fails
    }
  }
};