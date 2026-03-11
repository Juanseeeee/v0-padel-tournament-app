
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

// Load env vars
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  // Fallback to .env
  dotenv.config();
}

import { sql } from "../lib/db";

async function runSql() {
  const sqlFile = process.argv[2];
  if (!sqlFile) {
    console.error("Please provide a SQL file path");
    process.exit(1);
  }

  try {
    const filePath = path.resolve(process.cwd(), sqlFile);
    const sqlContent = fs.readFileSync(filePath, "utf-8");
    
    console.log(`Executing SQL from ${sqlFile}...`);
    
    // Simple split by semicolon, ignoring potential semicolons in strings for now
    // This is a naive implementation but should work for simple schema changes
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const statement of statements) {
      console.log(`Executing: ${statement.substring(0, 50)}...`);
      await sql(statement);
    }
    
    console.log("SQL executed successfully");
  } catch (error) {
    console.error("Error executing SQL:", error);
    process.exit(1);
  }
}

runSql();
