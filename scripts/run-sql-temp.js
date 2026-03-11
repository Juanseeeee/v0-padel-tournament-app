
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

console.log("STARTING JS SCRIPT...");

// Load env vars
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  console.log("Loading .env.local");
  dotenv.config({ path: envPath });
} else {
  console.log("Loading .env");
  dotenv.config();
}

console.log("DATABASE_URL present:", !!process.env.DATABASE_URL);

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

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
    
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const statement of statements) {
      console.log(`Executing: ${statement.substring(0, 50)}...`);
      // Mock a tagged template literal for the neon driver
      const strings = [statement];
      strings.raw = [statement];
      
      try {
        const result = await sql(strings);
        const resultStr = "Result: " + JSON.stringify(result, null, 2);
        console.log(resultStr);
        fs.appendFileSync(path.resolve(process.cwd(), "scripts/output.txt"), resultStr + "\n");
      } catch (e) {
        console.error("Error executing statement:", e);
        fs.appendFileSync(path.resolve(process.cwd(), "scripts/output.txt"), "Error: " + e + "\n");
      }
    }
    
    console.log("SQL executed successfully");
  } catch (error) {
    console.error("Error executing SQL:", error);
    process.exit(1);
  }
}

runSql();
