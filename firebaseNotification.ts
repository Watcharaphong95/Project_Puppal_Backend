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
    return title+','+body;
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
  const notifyOverdueOffsets = Array.from({ length: 30 }, (_, i) => i + 1); // วันหลังพลาดนัด

  const sqlAppointments = `
    SELECT a.aid, a.general_user_email, a.date, d.name as dogName, g.fcmToken
    FROM appointment a
    JOIN dog d ON a.dogId = d.dogId
    JOIN general g ON a.general_user_email = g.user_email
    WHERE a.date >= CURDATE() - INTERVAL 30 DAY
  `;

  const sqlInjection = `SELECT oldAppointment_aid, nextAppointment_aid FROM injectionRecord`;

  console.log("Starting notification process...");

  conn.query(sqlInjection, (errInjection: any, injectionRows: any) => {
    if (errInjection) {
      console.error("Injection query error:", errInjection);
      return callback(null, errInjection);
    }

    const oldAppointments = new Set<number>();
    const nextAppointments = new Set<number>();

    for (const row of injectionRows as any[]) {
      if (row.oldAppointment_aid) oldAppointments.add(row.oldAppointment_aid);
      if (row.nextAppointment_aid)
        nextAppointments.add(row.nextAppointment_aid);
    }

    conn.query(
      sqlAppointments,
      async (errAppoint: any, appointmentRows: any[]) => {
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

            if (
              data.appointmentAid !== undefined &&
              data.status !== undefined
            ) {
              const aidRaw = data.appointmentAid;

              // ถ้า aidRaw เป็น string และมีหลาย aid คั่นด้วย comma
              if (typeof aidRaw === "string" && aidRaw.includes(",")) {
                const aids = aidRaw.split(",").map((a) => Number(a.trim()));
                aids.forEach((aidNum) => {
                  aidStatusMap.set(aidNum, Number(data.status));
                });
              } else {
                const aidNum = Number(aidRaw);
                aidStatusMap.set(aidNum, Number(data.status));
              }
            }
          });

          // console.log([...aidStatusMap.keys()]);

          // Group appointments by user and type (overdue vs upcoming)
          const userNotifications = new Map<
            string,
            {
              fcmToken: string;
              overdueAppointments: any[];
              upcomingAppointments: any[];
              mostUrgentOverdue?: any;
              mostUrgentUpcoming?: any;
            }
          >();

          // Get today's date in Bangkok timezone, ignore time
          const today = new Date();
          const bangkokToday = new Date(
            today.toLocaleDateString("sv-SE", { timeZone: "Asia/Bangkok" })
          );

          for (const row of appointmentRows) {
            if (!row.date || !row.fcmToken) {
              continue;
            }

            // Extract only the date part, ignore time
            const appointmentDateStr = new Date(row.date).toLocaleDateString(
              "sv-SE",
              {
                timeZone: "Asia/Bangkok",
              }
            );
            const appointmentDate = new Date(appointmentDateStr);

            // Calculate differences using date-only comparison
            const diffDays = Math.floor(
              (appointmentDate.getTime() - bangkokToday.getTime()) /
                (1000 * 60 * 60 * 24)
            );
            const diffWeeks = Math.floor(diffDays / 7);

            // Better month calculation
            const todayMonth = bangkokToday.getMonth();
            const todayYear = bangkokToday.getFullYear();
            const appointmentMonth = appointmentDate.getMonth();
            const appointmentYear = appointmentDate.getFullYear();

            const diffMonths =
              (appointmentYear - todayYear) * 12 +
              (appointmentMonth - todayMonth);

            const sameWeekday =
              appointmentDate.getDay() === bangkokToday.getDay();
            const sameMonthDay =
              appointmentDate.getDate() === bangkokToday.getDate();

            const notifyByWeek =
              notifyWeekOffsets.includes(diffWeeks) && sameWeekday;
            const notifyByMonth =
              notifyMonthOffsets.includes(diffMonths) && sameMonthDay;
            const notifyByDay = notifyDayOffsets.includes(diffDays);
            const notifyOverdue =
              diffDays < 0 && notifyOverdueOffsets.includes(Math.abs(diffDays));

            // Check if should notify
            if (
              !(notifyByWeek || notifyByMonth || notifyByDay || notifyOverdue)
            ) {
              continue;
            }

            console.log("✔️ Map keys:", [...aidStatusMap.keys()]);

            const aid = Number(row.aid);
            const status = aidStatusMap.get(aid);

            console.log(status);

            // Status filter
            if (status !== undefined && status !== 0) {
              continue;
            }

            // Old appointment filter
            if (oldAppointments.has(aid)) {
              continue;
            }

            // Group by user email
            const userEmail = row.general_user_email;
            if (!userNotifications.has(userEmail)) {
              userNotifications.set(userEmail, {
                fcmToken: row.fcmToken,
                overdueAppointments: [],
                upcomingAppointments: [],
              });
            }

            const userData = userNotifications.get(userEmail)!;
            const appointmentWithDays = {
              ...row,
              diffDays: Math.abs(diffDays),
            };

            if (notifyOverdue) {
              userData.overdueAppointments.push(appointmentWithDays);
              // Keep the most overdue (highest days)
              if (
                !userData.mostUrgentOverdue ||
                Math.abs(diffDays) > userData.mostUrgentOverdue.diffDays
              ) {
                userData.mostUrgentOverdue = appointmentWithDays;
              }
            } else {
              userData.upcomingAppointments.push(appointmentWithDays);
              // Keep the most urgent upcoming (lowest days)
              if (
                !userData.mostUrgentUpcoming ||
                Math.abs(diffDays) < userData.mostUrgentUpcoming.diffDays
              ) {
                userData.mostUrgentUpcoming = appointmentWithDays;
              }
            }
          }

          const notified: string[] = [];

          // Send separate notifications for overdue and upcoming appointments
          for (const [userEmail, userData] of userNotifications.entries()) {
            const overdueCount = userData.overdueAppointments.length;
            const upcomingCount = userData.upcomingAppointments.length;

            // Send overdue notification
            if (overdueCount > 0 && userData.mostUrgentOverdue) {
              const appointmentDate = new Date(
                userData.mostUrgentOverdue.date.toLocaleDateString("sv-SE", {
                  timeZone: "Asia/Bangkok",
                })
              );
              const dateString = appointmentDate.toISOString().split("T")[0];
              const formattedDate = new Date(dateString).toLocaleDateString(
                "th-TH-u-ca-gregory",
                {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  timeZone: "Asia/Bangkok",
                }
              );

              const overdueMessage = {
                token: userData.fcmToken,
                notification: {
                  title:
                    overdueCount > 1
                      ? `⚠️ คุณมี ${overdueCount} นัดที่พลาดแล้ว!`
                      : `⚠️ ${userData.mostUrgentOverdue.dogName} พลาดนัดฉีดยาแล้ว!`,
                  body:
                    overdueCount > 1
                      ? `🐶นัดที่พลาดนานที่สุด: ${userData.mostUrgentOverdue.dogName} พลาดเมื่อ ${formattedDate} (${userData.mostUrgentOverdue.diffDays} วันแล้ว)`
                      : `🐶${userData.mostUrgentOverdue.dogName} พลาดนัดฉีดยาเมื่อวันที่ ${formattedDate} (${userData.mostUrgentOverdue.diffDays} วันแล้ว) กรุณาจองนัดใหม่โดยเร็ว`,
                },
              };

              try {
                await admin.messaging().send(overdueMessage);
                if (!notified.includes(userEmail)) notified.push(userEmail);
              } catch (fcmErr) {
                console.error(
                  `FCM send error for overdue ${userEmail}:`,
                  fcmErr
                );
              }
            }

            // Send upcoming notification
            if (upcomingCount > 0 && userData.mostUrgentUpcoming) {
              const appointmentDate = new Date(
                userData.mostUrgentUpcoming.date.toLocaleDateString("sv-SE", {
                  timeZone: "Asia/Bangkok",
                })
              );
              const dateString = appointmentDate.toISOString().split("T")[0];
              const formattedDate = new Date(dateString).toLocaleDateString(
                "th-TH-u-ca-gregory",
                {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  timeZone: "Asia/Bangkok",
                }
              );

              const upcomingMessage = {
                token: userData.fcmToken,
                notification: {
                  title:
                    upcomingCount > 1
                      ? `🗓️ คุณมี ${upcomingCount} นัดที่ยังไม่จอง`
                      : `🗓️ คุณยังไม่ได้จองฉีดยาให้กับ ${userData.mostUrgentUpcoming.dogName}`,
                  body:
                    upcomingCount > 1
                      ? `🐶นัดที่ใกล้ที่สุด: ${userData.mostUrgentUpcoming.dogName} วันที่ ${formattedDate} (อีก ${userData.mostUrgentUpcoming.diffDays} วัน)`
                      : `🐶${userData.mostUrgentUpcoming.dogName} มีนัดฉีดยาที่คุณยังไม่จองวันที่ ${formattedDate}`,
                },
              };

              try {
                await admin.messaging().send(upcomingMessage);
                if (!notified.includes(userEmail)) notified.push(userEmail);
              } catch (fcmErr) {
                console.error(
                  `FCM send error for upcoming ${userEmail}:`,
                  fcmErr
                );
              }
            }
          }

          callback(notified);
        } catch (firestoreErr) {
          console.error("Firestore error:", firestoreErr);
          callback(null, firestoreErr);
        }
      }
    );
  });
}
