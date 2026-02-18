
import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET() {
  try {
    console.log("Starting migration...");

    // Add columns to usuarios table
    await sql`
      ALTER TABLE usuarios 
      ADD COLUMN IF NOT EXISTS dni VARCHAR(20),
      ADD COLUMN IF NOT EXISTS telefono VARCHAR(50);
    `;

    // Add unique constraint to dni
    // We do this separately to handle potential existing duplicates if we were in production with data
    // But for now, we assume it's safe or we just add the index.
    // However, if there are nulls, UNIQUE allows multiple nulls in Postgres.
    // If we want it to be unique but nullable (for old admins), that's fine.
    // If we want it to be unique and not null, we'd need to backfill.
    // For now, let's just add the constraint.
    
    // Check if constraint exists or just try to add it. 
    // Easier to just add a unique index which achieves the same.
    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS usuarios_dni_idx ON usuarios (dni) WHERE dni IS NOT NULL;
    `;

    console.log("Migration completed successfully.");

    return NextResponse.json({ message: "Migration completed successfully" });
  } catch (error: any) {
    console.error("Migration error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
