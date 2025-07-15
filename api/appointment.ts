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


const queryAsync = (query: string, params: any[] = []): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    conn.query(query, params, (err: any, results: any[]) => {
      if (err) reject(err);
      else resolve(results);
    });
  });
};

router.post("/dataList", async (req, res) => {
    interface DataRequest {
    email: string;
    dogId: number[];
    aid: number[];
    clinicEmail: string[];
  }

  try {
    const data = req.body;

    // Prepare all queries
    const clinicQuery = mysql.format(
      "SELECT * FROM clinic WHERE user_email IN (?)",
      [data.clinicEmail]
    );

    const injectionAidQuery = mysql.format(
      "SELECT DISTINCT oldAppointment_aid FROM injectionRecord WHERE oldAppointment_aid IN (?)",
      [data.aid]
    );

    const aidQuery = mysql.format(
      "SELECT * FROM appointment WHERE general_user_email = ?",
      [data.email]
    );

    // Execute injection and appointment queries in parallel
    const [injectionResult, aidResult] = await Promise.all([
      queryAsync(injectionAidQuery),
      queryAsync(aidQuery)
    ]);

    // Process injection results
    const injectionAids = injectionResult.map((row: any) => row.oldAppointment_aid);

    // Get dog IDs from appointments
    const appointmentDogIds = aidResult.map((a: any) => a.dogId);
    const combinedDogIds = [...new Set([...appointmentDogIds, ...data.dogId])];

    // Prepare dog query
    const dogQuery = mysql.format("SELECT * FROM dog WHERE dogId IN (?)", [
      combinedDogIds.length > 0 ? combinedDogIds : [-1]
    ]);

    // Execute dog and clinic queries in parallel
    const [dogResult, clinicResult] = await Promise.all([
      queryAsync(dogQuery),
      queryAsync(clinicQuery)
    ]);

    // Process appointments (convert dates and update status)
    const updatedAppointments = aidResult.map((appointment: any) => {
      const aid = appointment.aid;
      const isInSentAid = data.aid.includes(aid);
      const hasInjectionRecord = injectionAids.includes(aid);

      // Convert appointment.date to Asia/Bangkok timezone
      if (appointment.date) {
        appointment.date = new Date(appointment.date).toLocaleDateString("sv-SE", {
          timeZone: "Asia/Bangkok"
        });
      }

      if (!isInSentAid && !hasInjectionRecord) {
        return { ...appointment, status: 0 };
      }
      return appointment;
    });

    // Convert dog birthdays
    dogResult.forEach((dog: any) => {
      if (dog.birthday) {
        dog.birthday = new Date(dog.birthday).toLocaleDateString("sv-SE", {
          timeZone: "Asia/Bangkok"
        });
      }
    });

    res.status(200).json({
      dogs: dogResult,
      appointments: updatedAppointments,
      clinics: clinicResult,
    });

  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
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
console.log("SQL Query:", sql);
console.time("insertAppointment");
  conn.query(sql, (err, result) => {
    console.timeEnd("insertAppointment");
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
    res.status(201).json({ aid: result.insertId });
    if (err) {
      res.status(404).json({ message: err.sqlMessage });
    } else {
      res.status(201).json({ affected_Rows: result.affectedRows });
    }
  });
})

router.get("/latestdate/:aids/:email", (req, res) => {
  const aidsParam = req.params.aids; // '32,56'
  const email = req.params.email;

  const aidsArray = aidsParam.split(',').map(aid => parseInt(aid.trim()));

  const placeholders = aidsArray.map(() => '?').join(',');

  const sql = `
    SELECT dogId, general_user_email, MAX(date) as latest_date, GROUP_CONCAT(DISTINCT vaccine SEPARATOR ', ') AS vaccines
    FROM appointment
    WHERE aid IN (${placeholders}) AND general_user_email = ?
    GROUP BY dogId, general_user_email
  `;

  conn.query(mysql.format(sql, [...aidsArray, email]), (err, result) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err });
    }
    if (result.length === 0) {
      return res.status(404).json({ message: "No appointment records found" });
    }

    res.status(200).json({ data: result });
  });
});




