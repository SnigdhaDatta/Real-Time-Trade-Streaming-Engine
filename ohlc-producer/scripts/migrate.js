import fs from "fs";
import path from "path";
import { Pool } from "pg";

const schemaPath = path.resolve(process.cwd(), "../../shared/db/schema.sql");

const pool = new Pool ({
    user: "postgres",
    host: "localhost",
    database: "crypto_market",
    password: "postgres",
    port: 5432,
})

const sql = fs.readFileSync(schemaPath, "utf8");

console.log("Creating ohlc_candles schema in the database...");
await pool.query(sql);
console.log("Schema created successfully!");

console.log("Migration Completed so Closing database connection...");
await pool.end();
