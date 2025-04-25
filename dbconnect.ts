import mysql from "mysql";

export const conn = mysql.createPool({
  connectionLimit: 10,
  host: "mysql-puppal.alwaysdata.net",
  user: "puppal",
  password: "puppal_1234",
  database: "puppal_data",
});