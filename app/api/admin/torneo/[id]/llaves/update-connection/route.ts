
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    const body = await request.json();
    const { source_match_id, target_match_id, target_slot } = body;

    if (!source_match_id || !target_match_id || !target_slot) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 1. Get the current connection of the source match
    const sourceMatch = await sql`SELECT * FROM llaves WHERE id = ${source_match_id}`;
    if (sourceMatch.length === 0) return NextResponse.json({ error: "Source match not found" }, { status: 404 });
    
    // 2. Find if any other match is already pointing to the target slot
    const existingConnection = await sql`
      SELECT * FROM llaves 
      WHERE siguiente_llave_id = ${target_match_id} 
      AND siguiente_llave_slot = ${target_slot}
      AND id != ${source_match_id}
    `;

    // 3. Update source match to point to target
    await sql`
      UPDATE llaves 
      SET siguiente_llave_id = ${target_match_id}, siguiente_llave_slot = ${target_slot}
      WHERE id = ${source_match_id}
    `;

    // 4. If there was a conflict (swap), update the other match to point to where source was pointing
    if (existingConnection.length > 0) {
      const otherMatch = existingConnection[0];
      const oldTargetId = sourceMatch[0].siguiente_llave_id;
      const oldTargetSlot = sourceMatch[0].siguiente_llave_slot;

      if (oldTargetId && oldTargetSlot) {
        await sql`
          UPDATE llaves 
          SET siguiente_llave_id = ${oldTargetId}, siguiente_llave_slot = ${oldTargetSlot}
          WHERE id = ${otherMatch.id}
        `;
      } else {
        // If source didn't have a target (unlikely), just clear the other match's target?
        // Or leave it pointing to the same place (duplicate)? No, that's bad.
        // Let's set it to null if we can't swap.
        await sql`
          UPDATE llaves 
          SET siguiente_llave_id = NULL, siguiente_llave_slot = NULL
          WHERE id = ${otherMatch.id}
        `;
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error updating connection:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
