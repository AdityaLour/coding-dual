import mysql from "mysql2/promise";
import "dotenv/config";

const connection = await mysql.createPool({
  host: process.env.DB_HOST,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
});

export default connection;
