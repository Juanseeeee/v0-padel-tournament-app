import fs from "fs";
import path from "path";
import dotenv from "dotenv";

// Load env vars
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log("Loaded .env.local");
} else {
  // Fallback to .env
  dotenv.config();
  console.log("Loaded .env");
}

async function runSql() {
  const sqlFile = process.argv[2];
  if (!sqlFile) {
    console.error("Please provide a SQL file path");
    process.exit(1);
  }

  // Dynamic import to ensure env vars are loaded first
  const { sql } = await import("../lib/db");

  try {
    const filePath = path.resolve(process.cwd(), sqlFile);
    const sqlContent = fs.readFileSync(filePath, "utf-8");
    
    console.log(`Executing SQL from ${sqlFile}...`);
    
    // Simple split by semicolon
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const statement of statements) {
      if (!statement.trim()) continue;
      // console.log(`Executing: ${statement.substring(0, 50)}...`);
      // Use sql.query if available, otherwise fallback to tagged template logic?
      // The error message suggests sql.query exists for raw queries
      if (typeof (sql as any) === 'function') {
        // Try calling it as a function with the query string directly if it supports it
        // Wait, the error said: use sql.query("SELECT $1", [value], options)
        // Let's try to access .query on the function object
        if (typeof (sql as any).query === 'function') {
           await (sql as any).query(statement);
        } else {
           // If no .query, try to construct a fake template object
           // But actually, maybe we can just use the raw string in an array?
           // We already tried [statement] and it failed.
           // Let's try passing the string directly to the function, maybe it works if no args?
           // But the error said "not sql("SELECT $1", [value], options)".
           // It implies sql(string) is invalid.
           
           // If we cannot use neon driver this way, let's use a postgres client from 'pg' or similar if installed.
           // Or just use the neon driver correctly.
           
           // Maybe we can use a tagged template literal with the statement?
           // await sql`${statement}`; NO, this parameterizes it.
           
           // Hack: Create a template object manually
           // const template = [statement] as any;
           // template.raw = [statement];
           // await sql(template);
           
           const template = [statement] as any;
           template.raw = [statement];
           await (sql as any)(template);
        }
      }
    }
    
    console.log("SQL executed successfully");
  } catch (error) {
    console.error("Error executing SQL:", error);
    process.exit(1);
  }
}

runSql();
