import express from "express";
import { conn } from "../dbconnect";
import mysql from "mysql";
import { AppointmentPost } from "../model/appointmentPost";
import { dataListPost } from "../model/dataListPost";

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

router.post("/dataList", (req, res) => {
  let data: {
    email: string;
    dogId: number[];
    aid: number[];
    clinicEmail: string[];
  } = req.body;

  const clinicQuery = mysql.format(
    "SELECT * FROM clinic WHERE user_email IN (?)",
    [data.clinicEmail]
  );

  const injectionAidQuery = `SELECT DISTINCT oldAppointment_aid FROM injectionRecord WHERE oldAppointment_aid IN (?)`;
  const injectionAidFormatted = mysql.format(injectionAidQuery, [data.aid]);

  const aidQuery = mysql.format(
    "SELECT * FROM appointment WHERE general_user_email = ?",
    [data.email]
  );

  conn.query(injectionAidFormatted, (err, injectionResult) => {
    if (err) throw err;

    const injectionAids = injectionResult.map(
      (row: any) => row.oldAppointment_aid
    );

    conn.query(aidQuery, (err, aidResult) => {
      if (err) throw err;

      // Get all dogIds from appointments returned
      const appointmentDogIds = aidResult.map((a: any) => a.dogId);
      const combinedDogIds = [
        ...new Set([...appointmentDogIds, ...data.dogId]),
      ];

      // Query dogs with all these dogIds
      const dogQuery = mysql.format("SELECT * FROM dog WHERE dogId IN (?)", [
        combinedDogIds.length > 0 ? combinedDogIds : [-1],
      ]);

      conn.query(dogQuery, (err, dogResult) => {
        if (err) throw err;

        conn.query(clinicQuery, (err, clinicResult) => {
          if (err) throw err;

          // Update appointment status and convert dates to Asia/Bangkok timezone
          const updatedAppointments = aidResult.map((appointment: any) => {
            const aid = appointment.aid;
            const isInSentAid = data.aid.includes(aid);
            const hasInjectionRecord = injectionAids.includes(aid);

            // Convert appointment.date to Asia/Bangkok timezone string yyyy-MM-dd
            if (appointment.date) {
              const localDate = new Date(appointment.date).toLocaleDateString(
                "sv-SE",
                {
                  timeZone: "Asia/Bangkok",
                }
              );
              appointment.date = localDate;
            }

            if (!isInSentAid && !hasInjectionRecord) {
              return { ...appointment, status: 0 };
            }
            return appointment;
          });

          // Also convert dog's birthday date to Asia/Bangkok (optional)
          dogResult.forEach((dog: any) => {
            if (dog.birthday) {
              dog.birthday = new Date(dog.birthday).toLocaleDateString(
                "sv-SE",
                {
                  timeZone: "Asia/Bangkok",
                }
              );
            }
          });

          res.status(200).json({
            dogs: dogResult,
            appointments: updatedAppointments,
            clinics: clinicResult,
          });
        });
      });
    });
  });
});

// router.post("/", (req, res) => {
//   let app: AppointmentPost = req.body;
//   let dateTemp = new Date(app.date);
//   dateTemp.setMonth(dateTemp.getMonth() + app.month);

//   const year = dateTemp.getFullYear();
//   const month = String(dateTemp.getMonth() + 1).padStart(2, "0");
//   const day = String(dateTemp.getDate()).padStart(2, "0");
//   const formattedDate = `${year}-${month}-${day}`;

//   let sql =
//     "INSERT INTO appointment (dogId, general_user_email, vaccine, date) VALUES (?,?,?,?)";
//   sql = mysql.format(sql, [
//     app.dogId,
//     app.general_user_email,
//     app.vaccine,
//     formattedDate,
//   ]);

//   conn.query(sql, (err, result) => {
//     if (err) {
//       res.status(404).json({ message: err.sqlMessage });
//     } else {
//       res.status(201).json({ insertId: result.insertId });
//     }
//   });
// });

router.post("/", (req, res) => {
  let app = req.body;

  const monthToAdd = typeof app.month === "number" ? app.month : 0;

  let dateTemp = new Date(app.date);
  dateTemp.setMonth(dateTemp.getMonth() + monthToAdd);

  const year = dateTemp.getFullYear();
  const month = String(dateTemp.getMonth() + 1).padStart(2, "0");
  const day = String(dateTemp.getDate()).padStart(2, "0");
  const formattedDate = `${year}-${month}-${day}`;

  // Log ข้อมูลเพื่อ debug
  console.log("Inserting appointment with date:", formattedDate);

  let sql =
    "INSERT INTO appointment (dogId, general_user_email, vaccine, date) VALUES (?, ?, ?, ?)";
  sql = mysql.format(sql, [
    app.dogId,
    app.general_user_email,
    app.vaccine,
    formattedDate,
  ]);

  conn.query(sql, (err, result) => {
    if (err) {
      console.error("SQL Error:", err.sqlMessage);
      res.status(500).json({ message: err.sqlMessage });
    } else {
      res.status(201).json({ insertId: result.insertId });
    }
  });
});

router.put("/:aid", (req, res) => {
  let aid = req.params.aid;
  let sql = "UPDATE appointment SET status = ? WHERE aid = ?";
  sql = mysql.format(sql, [1, aid]);
  conn.query(sql, (err, result) => {
    if (err) {
      res.status(404).json({ message: err.sqlMessage });
    } else {
      res.status(201).json({ affected_Rows: result.affectedRows });
    }
  });
});
