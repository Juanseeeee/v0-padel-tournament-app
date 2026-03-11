
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env.local');
console.log('Loading .env.local from:', envPath);

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log('Loaded .env.local');
} else {
  console.error('.env.local file not found');
}

// Dynamic import to ensure dotenv is loaded first
async function main() {
  const { sql } = await import('../lib/db');
  await createAuditTable(sql);
}

async function createAuditTable(sql: any) {
  try {
    console.log('Creating audit_logs table...');
    await sql`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        action TEXT NOT NULL,
        details JSONB,
        user_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    console.log('audit_logs table created successfully.');
  } catch (error) {
    console.error('Error creating audit_logs table:', error);
  }
}

main();
