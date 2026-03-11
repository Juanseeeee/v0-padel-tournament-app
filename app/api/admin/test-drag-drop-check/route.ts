import { sql } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const logs: string[] = [];
  const log = (msg: string) => logs.push(`[${new Date().toISOString()}] ${msg}`);
  
  // Use a fixed URL base, assuming running on localhost:3000 for this test
  const BASE_URL = "http://localhost:3000";

  let torneoId = 0;
  
  try {
    log("Iniciando prueba de regresión Drag & Drop...");

    // 0. Debug: Check table columns and triggers
    log("Checking table schema for fechas_torneo and parejas_zona...");
    const columnsFechas = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'fechas_torneo'
    `;
    log(`Columns fechas_torneo: ${JSON.stringify(columnsFechas)}`);

    const columnsParejasZona = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'parejas_zona'
    `;
    log(`Columns parejas_zona: ${JSON.stringify(columnsParejasZona)}`);

    const columnsZonas = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'zonas'
    `;
    log(`Columns zonas: ${JSON.stringify(columnsZonas)}`);

    const columnsJugadores = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'jugadores'
    `;
    log(`Columns jugadores: ${JSON.stringify(columnsJugadores)}`);



    const constraints = await sql`
      SELECT conname, pg_get_constraintdef(oid)
      FROM pg_constraint
      WHERE conrelid = 'parejas_zona'::regclass
    `;
    log(`Constraints parejas_zona: ${JSON.stringify(constraints)}`);

    // Check for 'fecha_inicio' in function definitions
    const functionsWithFechaInicio = await sql`
      SELECT proname, prosrc 
      FROM pg_proc 
      WHERE prosrc LIKE '%fecha_inicio%'
    `;
    log(`Functions using 'fecha_inicio': ${JSON.stringify(functionsWithFechaInicio)}`);

    // 1. Setup: Crear Torneo Dummy
    // Usamos numero_fecha = 12 para cumplir con el CHECK constraint (1-12)
    // Usamos una temporada futura (2099) para evitar colisiones con datos reales si existiera unique constraint
    const numero_fecha = 12;
    const fecha_calendario = '2099-01-01'; 
    const sede = 'TEST_SEDE';
    const duracion = 60;
    const temporada = 2099;
    
    // Get a valid category ID
    const catRes = await sql`SELECT id FROM categorias LIMIT 1`;
    if (catRes.length === 0) {
        throw new Error("No categories found in database. Cannot create test tournament.");
    }
    const cat = catRes[0].id;
    log(`Using category ID: ${cat}`);

    log("Intentando INSERT en fechas_torneo...");
    const torneoRes = await sql`
      INSERT INTO fechas_torneo (
        numero_fecha, 
        fecha_calendario, 
        sede, 
        duracion_partido_min,
        temporada,
        categoria_id
      )
      VALUES (
        ${numero_fecha}, 
        ${fecha_calendario}, 
        ${sede}, 
        ${duracion},
        ${temporada},
        ${cat}
      )
      RETURNING id
    `;
    torneoId = torneoRes[0].id;
    log(`Torneo de prueba creado: ID ${torneoId}`);

    // 2. Crear Zona
    // Adjust columns based on schema check (but for now try minimal insert)
    // If cantidad_parejas fails, maybe it's not needed or named differently.
    // We will just insert name and type if possible, or try to deduce from logs in next run.
    // For now, let's remove cantidad_parejas as it caused error.
    const zonaRes = await sql`
      INSERT INTO zonas (fecha_torneo_id, nombre, tipo)
      VALUES (${torneoId}, 'Zona A', 'grupo')
      RETURNING id
    `;

    const zonaId = zonaRes[0].id;
    log(`Zona creada: ID ${zonaId}`);

    // 3. Crear Parejas (Dummy in parejas_torneo)
    // We need mock players first if parejas_torneo has FK to players? 
    // Let's check schema of parejas_torneo. Assuming it links to players or just names?
    // Usually parejas_torneo links to jugador1_id, jugador2_id.
    
    // Create dummy players
    // Removed DNI as it does not exist
    // Use categoria_actual_id instead of categoria_id
    const p1Res = await sql`INSERT INTO jugadores (nombre, apellido, categoria_actual_id) VALUES ('J1_P1', 'Test', ${cat}) RETURNING id`;
    const p2Res = await sql`INSERT INTO jugadores (nombre, apellido, categoria_actual_id) VALUES ('J2_P1', 'Test', ${cat}) RETURNING id`;
    const p3Res = await sql`INSERT INTO jugadores (nombre, apellido, categoria_actual_id) VALUES ('J1_P2', 'Test', ${cat}) RETURNING id`;
    const p4Res = await sql`INSERT INTO jugadores (nombre, apellido, categoria_actual_id) VALUES ('J2_P2', 'Test', ${cat}) RETURNING id`;


    
    const id1 = p1Res[0].id;
    const id2 = p2Res[0].id;
    const id3 = p3Res[0].id;
    const id4 = p4Res[0].id;

    const par1Res = await sql`INSERT INTO parejas_torneo (fecha_torneo_id, jugador1_id, jugador2_id) VALUES (${torneoId}, ${id1}, ${id2}) RETURNING id`;
    const par2Res = await sql`INSERT INTO parejas_torneo (fecha_torneo_id, jugador1_id, jugador2_id) VALUES (${torneoId}, ${id3}, ${id4}) RETURNING id`;
    
    const PID = par1Res[0].id;
    const SWAP_ID = par2Res[0].id;
    log(`Parejas creadas: PID=${PID}, SWAP_ID=${SWAP_ID}`);

    // 4. Add to parejas_zona
    const r1 = await sql`INSERT INTO parejas_zona (zona_id, pareja_id, posicion_final) VALUES (${zonaId}, ${PID}, 1) RETURNING id`;
    const r2 = await sql`INSERT INTO parejas_zona (zona_id, pareja_id, posicion_final) VALUES (${zonaId}, ${SWAP_ID}, 2) RETURNING id`;
    
    const rowAId = r1[0].id;
    const rowBId = r2[0].id;
    log(`Parejas añadidas a zona: RowA=${rowAId}, RowB=${rowBId}`);

    // 5. Simulate Swap Logic
    log("Iniciando simulación de Swap (Sequential Calls)...");
    const TEMP_ID = null;

    try {
         log("Step 1: Set RowA pareja_id to NULL");
         await sql`UPDATE parejas_zona SET pareja_id = ${TEMP_ID} WHERE id = ${rowAId}`;
         
         log("Step 2: Set RowB pareja_id to PID");
         await sql`UPDATE parejas_zona SET pareja_id = ${PID} WHERE id = ${rowBId}`;
         
         log("Step 3: Set RowA pareja_id to SWAP_ID");
         await sql`UPDATE parejas_zona SET pareja_id = ${SWAP_ID} WHERE id = ${rowAId}`;
         
         log("Swap exitoso!");
    } catch (err: any) {
        log(`Swap FALLÓ: ${err.message}`);
        throw err;
    }


    return NextResponse.json({ success: true, logs });

  } catch (e: any) {
    log(`ERROR FATAL: ${e.message}`);
    console.error("TEST DRAG DROP ERROR:", e);
    // Return 200 even on error so we can see the logs in the browser easily
    return NextResponse.json({ success: false, logs, error: e.message, stack: e.stack }, { status: 200 });
  } finally {
    // Cleanup
    if (torneoId) {
        log("Limpiando datos de prueba...");
        try {
          await sql`DELETE FROM partidos_zona WHERE zona_id IN (SELECT id FROM zonas WHERE fecha_torneo_id = ${torneoId})`;
          await sql`DELETE FROM parejas_zona WHERE zona_id IN (SELECT id FROM zonas WHERE fecha_torneo_id = ${torneoId})`;
          await sql`DELETE FROM zonas WHERE fecha_torneo_id = ${torneoId}`;
          await sql`DELETE FROM parejas_torneo WHERE fecha_torneo_id = ${torneoId}`;
          await sql`DELETE FROM fechas_torneo WHERE id = ${torneoId}`;
        } catch (cleanupError: any) {
          log(`Error cleaning up: ${cleanupError.message}`);
        }
    }
    // Clean specific test players if possible
    try {
      await sql`DELETE FROM jugadores WHERE nombre LIKE 'J%_P%' AND apellido = 'Test'`;
      await sql`DELETE FROM jugadores WHERE nombre LIKE 'TestJ%' AND apellido LIKE 'TestA%'`;
    } catch (cleanupError: any) {
      log(`Error cleaning up players: ${cleanupError.message}`);
    }
  }
}
