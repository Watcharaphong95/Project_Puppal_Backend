import * as admin from "firebase-admin";
import { conn } from "./dbconnect";
import moment from "moment";

// Initialize Firebase Admin SDK
const serviceAccount = JSON.parse(
  process.env.FIREBASE_SERVICE_ACCOUNT as string
);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

// Function to send a message to a device by FCM token
export async function sendFCMToken(token: string, title: string, body: string) {
  const message = {
    notification: {
      title,
      body,
    },
    token,
  };

  try {
    const response = await admin.messaging().send(message);
    console.log("✅ Notification sent:", response);
  } catch (error) {
    console.error("❌ Failed to send notification:", error);
  }
}

export function notifyUpcomingAppointments(
  callback: (notified: string[] | null, error?: any) => void
) {
  const notifyWeekOffsets = [1, 2]; // สัปดาห์ก่อน
  const notifyMonthOffsets = [1, 3, 6, 12]; // เดือนก่อน
  const notifyDayOffsets = [1, 2, 3]; // วันก่อน
  const notifyOverdueOffsets = Array.from({length: 30}, (_, i) => i + 1); // วันหลังพลาดนัด

  const sqlAppointments = `
    SELECT a.aid, a.general_user_email, a.date, d.name as dogName, g.fcmToken
    FROM appointment a
    JOIN dog d ON a.dogId = d.dogId
    JOIN general g ON a.general_user_email = g.user_email
    WHERE a.date >= CURDATE() - INTERVAL 30 DAY
  `;

  const sqlInjection = `SELECT oldAppointment_aid, nextAppointment_aid FROM injectionRecord`;

  console.log('Starting notification process...');

  conn.query(sqlInjection, (errInjection: any, injectionRows: any) => {
    if (errInjection) {
      console.error("Injection query error:", errInjection);
      return callback(null, errInjection);
    }

    const oldAppointments = new Set<number>();
    const nextAppointments = new Set<number>();

    for (const row of injectionRows as any[]) {
      if (row.oldAppointment_aid) oldAppointments.add(row.oldAppointment_aid);
      if (row.nextAppointment_aid) nextAppointments.add(row.nextAppointment_aid);
    }

    conn.query(sqlAppointments, async (errAppoint: any, appointmentRows: any[]) => {
      if (errAppoint) {
        console.error("Appointment query error:", errAppoint);
        return callback(null, errAppoint);
      }

      try {
        const firestore = admin.firestore();
        const reserveSnapshot = await firestore.collection("reserve").get();

        const aidStatusMap = new Map<number, number>();
        reserveSnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.aid !== undefined && data.status !== undefined) {
            aidStatusMap.set(data.aid, data.status);
          }
        });

        const notified: string[] = [];

        // Get today's date in Bangkok timezone, ignore time
        const today = new Date();
        const bangkokToday = new Date(today.toLocaleDateString("sv-SE", { timeZone: "Asia/Bangkok" }));

        for (const row of appointmentRows) {
          if (!row.date) {
            console.log('Skipping appointment with no date:', row.aid);
            continue;
          }

          // Extract only the date part, ignore time
          const appointmentDateStr = new Date(row.date).toLocaleDateString("sv-SE", {
            timeZone: "Asia/Bangkok",
          });
          const appointmentDate = new Date(appointmentDateStr);

          // Calculate differences using date-only comparison
          const diffDays = Math.floor((appointmentDate.getTime() - bangkokToday.getTime()) / (1000 * 60 * 60 * 24));
          const diffWeeks = Math.floor(diffDays / 7);
          
          // Better month calculation
          const todayMonth = bangkokToday.getMonth();
          const todayYear = bangkokToday.getFullYear();
          const appointmentMonth = appointmentDate.getMonth();
          const appointmentYear = appointmentDate.getFullYear();
          
          const diffMonths = (appointmentYear - todayYear) * 12 + (appointmentMonth - todayMonth);

          const sameWeekday = appointmentDate.getDay() === bangkokToday.getDay();
          const sameMonthDay = appointmentDate.getDate() === bangkokToday.getDate();

          const notifyByWeek = notifyWeekOffsets.includes(diffWeeks) && sameWeekday;
          const notifyByMonth = notifyMonthOffsets.includes(diffMonths) && sameMonthDay;
          const notifyByDay = notifyDayOffsets.includes(diffDays);
          
          // Add overdue notification check
          const notifyOverdue = diffDays < 0 && notifyOverdueOffsets.includes(Math.abs(diffDays));

          // Check FCM token first
          if (!row.fcmToken) {
            continue;
          }

          // Check if should notify (including overdue)
          if (!(notifyByWeek || notifyByMonth || notifyByDay || notifyOverdue)) {
            continue;
          }

          const aid = row.aid;
          const status = aidStatusMap.get(aid);

          // Status filter
          if (status !== undefined && status !== 0) {
            continue;
          }

          // Old appointment filter
          if (oldAppointments.has(aid)) {
            continue;
          }

          const dateString = appointmentDate.toISOString().split("T")[0]; // yyyy-mm-dd
          const formattedDate = new Date(dateString).toLocaleDateString("th-TH-u-ca-gregory", { 
            year: "numeric", 
            month: "long", 
            day: "numeric", 
            timeZone: "Asia/Bangkok" 
          });

          let message;

          if (notifyOverdue) {
            // Overdue notification
            const daysOverdue = Math.abs(diffDays);
            message = {
              token: row.fcmToken,
              notification: {
                title: `⚠️ ${row.dogName} พลาดนัดฉีดยาแล้ว!`,
                body: `🐶${row.dogName} พลาดนัดฉีดยาเมื่อวันที่ ${formattedDate} (${daysOverdue} วันแล้ว) กรุณาจองนัดใหม่โดยเร็ว`,
              },
            };
          } else {
            // Regular upcoming notification
            message = {
              token: row.fcmToken,
              notification: {
                title: `🗓️ คุณยังไม่ได้จองฉีดยาให้กับ ${row.dogName}`,
                body: `🐶${row.dogName} มีนัดฉีดยาที่คุณยังไม่จองวันที่ ${formattedDate}`,
              },
            };
          }

          try {
            await admin.messaging().send(message);
            notified.push(row.general_user_email);
          } catch (fcmErr) {
            console.error(`FCM send error for ${row.general_user_email}:`, fcmErr);
          }
        }

        callback(notified);
      } catch (firestoreErr) {
        console.error("Firestore error:", firestoreErr);
        callback(null, firestoreErr);
      }
    });
  });
}