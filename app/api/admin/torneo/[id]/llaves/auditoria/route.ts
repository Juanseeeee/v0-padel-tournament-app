import { NextResponse, NextRequest } from "next/server";
import { auditarLlaves } from "@/lib/bracket-auditor";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const torneoId = parseInt(id);

  try {
    const { isValido, logs, inconsistencias } = await auditarLlaves(torneoId);

    return NextResponse.json({
      success: true,
      isValido,
      inconsistencias,
      logs
    });
  } catch (error) {
    console.error("Error en auditoría de llaves:", error);
    return NextResponse.json({ success: false, error: "Error en el servidor" }, { status: 500 });
  }
}