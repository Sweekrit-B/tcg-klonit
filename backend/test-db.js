import * as dotenv from "dotenv";
dotenv.config();
import pg from "pg";

const { Pool } = pg;
const pool = new Pool();

try {
  const client = await pool.connect();
  console.log("✅ DB connection succeeded");
  const res = await client.query("SELECT NOW()");
  console.log(res.rows);
  client.release();
} catch (err) {
  console.error("❌ DB connection failed:", err);
}
