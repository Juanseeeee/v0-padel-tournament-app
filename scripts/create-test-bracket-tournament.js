const { neon } = require("@neondatabase/serverless");
require("dotenv").config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL);

const ZONE_FIXTURES = [
  {
    name: "Zona A",
    day: "viernes",
    startHour: "18:00",
    teams: [
      { idx: 0, pos: 1, stats: { won: 2, lost: 0, setsWon: 4, setsLost: 0, gamesWon: 24, gamesLost: 12 } },
      { idx: 1, pos: 2, stats: { won: 1, lost: 1, setsWon: 2, setsLost: 2, gamesWon: 21, gamesLost: 20 } },
      { idx: 2, pos: 3, stats: { won: 1, lost: 1, setsWon: 2, setsLost: 2, gamesWon: 19, gamesLost: 19 } },
      { idx: 3, pos: 4, stats: { won: 0, lost: 2, setsWon: 0, setsLost: 4, gamesWon: 11, gamesLost: 24 } },
    ],
    matches: [
      { p1: 0, p2: 1, type: "inicial_1", order: 1, score: [6, 3, 6, 4], winner: 0, court: 1, time: "18:00:00" },
      { p1: 2, p2: 3, type: "inicial_2", order: 2, score: [6, 2, 6, 3], winner: 2, court: 2, time: "18:00:00" },
      { p1: 1, p2: 3, type: "perdedores", order: 3, score: [6, 4, 6, 2], winner: 1, court: 1, time: "19:00:00" },
      { p1: 0, p2: 2, type: "ganadores", order: 4, score: [6, 4, 6, 3], winner: 0, court: 2, time: "19:00:00" },
    ],
  },
  {
    name: "Zona B",
    day: "sabado",
    startHour: "14:00",
    teams: [
      { idx: 4, pos: 1, stats: { won: 2, lost: 0, setsWon: 4, setsLost: 1, gamesWon: 25, gamesLost: 16 } },
      { idx: 5, pos: 2, stats: { won: 1, lost: 1, setsWon: 3, setsLost: 2, gamesWon: 24, gamesLost: 22 } },
      { idx: 6, pos: 3, stats: { won: 1, lost: 1, setsWon: 2, setsLost: 3, gamesWon: 20, gamesLost: 22 } },
      { idx: 7, pos: 4, stats: { won: 0, lost: 2, setsWon: 1, setsLost: 4, gamesWon: 14, gamesLost: 23 } },
    ],
    matches: [
      { p1: 4, p2: 5, type: "inicial_1", order: 1, score: [6, 4, 6, 2], winner: 4, court: 1, time: "14:00:00" },
      { p1: 6, p2: 7, type: "inicial_2", order: 2, score: [4, 6, 6, 3, 10, 6], winner: 6, court: 2, time: "14:00:00" },
      { p1: 5, p2: 7, type: "perdedores", order: 3, score: [6, 1, 6, 4], winner: 5, court: 1, time: "15:00:00" },
      { p1: 4, p2: 6, type: "ganadores", order: 4, score: [7, 5, 6, 4], winner: 4, court: 2, time: "15:00:00" },
    ],
  },
];

const BRACKET_FIXTURE = [
  { ronda: "4tos", posicion: 1, p1Seed: "3A", p2Seed: "2B", source: ["3A", "2B"] },
  { ronda: "4tos", posicion: 2, p1Seed: "3B", p2Seed: "2A", source: ["3B", "2A"] },
  { ronda: "semis", posicion: 1, p1Seed: "1A", p2Seed: null, source: ["1A", null] },
  { ronda: "semis", posicion: 2, p1Seed: null, p2Seed: "1B", source: [null, "1B"] },
  { ronda: "final", posicion: 1, p1Seed: null, p2Seed: null, source: [null, null] },
];

function getArg(name) {
  return process.argv.find((arg) => arg.startsWith(`--${name}=`))?.split("=")[1];
}

function getMode() {
  const mode = process.argv[2];
  return mode === "cleanup" ? "cleanup" : "create";
}

function isoDatePlusDays(baseDate, daysToAdd) {
  const date = new Date(`${baseDate}T00:00:00`);
  date.setDate(date.getDate() + daysToAdd);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

async function getDefaultCategoryId() {
  const rows = await sql`SELECT id FROM categorias ORDER BY id ASC LIMIT 1`;
  const categoriaId = rows[0]?.id;
  if (!categoriaId) {
    throw new Error("No se encontro ninguna categoria para crear el torneo de prueba");
  }
  return categoriaId;
}

async function createTournament() {
  const categoriaId = Number(getArg("categoria")) || await getDefaultCategoryId();
  const token = `TEST_LLAVES_${Date.now()}`;
  const fechaBase = "2099-01-02";
  const numeroFecha = 12;
  const sede = token;
  let torneoId = null;

  try {
    const torneoRows = await sql`
      INSERT INTO fechas_torneo (
        numero_fecha,
        fecha_calendario,
        sede,
        estado,
        temporada,
        categoria_id,
        dias_torneo,
        formato_zona,
        duracion_partido_min,
        hora_inicio,
        hora_inicio_viernes,
        hora_inicio_sabado,
        modalidad,
        dias_juego,
        publicado
      )
      VALUES (
        ${numeroFecha},
        ${fechaBase},
        ${sede},
        'en_juego',
        2099,
        ${categoriaId},
        3,
        4,
        60,
        '10:00',
        '18:00',
        '14:00',
        'normal_3_sets_6',
        'viernes,sabado,domingo',
        false
      )
      RETURNING id
    `;
    torneoId = torneoRows[0].id;

    const jugadores = [];
    for (let i = 1; i <= 16; i++) {
      const playerRows = await sql`
        INSERT INTO jugadores (
          nombre,
          apellido,
          genero,
          categoria_actual_id,
          estado
        )
        VALUES (
          ${`Test${String(i).padStart(2, "0")}`},
          ${token},
          'masculino',
          ${categoriaId},
          'activo'
        )
        RETURNING id
      `;
      jugadores.push(playerRows[0].id);
    }

    const parejas = [];
    for (let i = 0; i < 8; i++) {
      const parejaRows = await sql`
        INSERT INTO parejas_torneo (
          fecha_torneo_id,
          jugador1_id,
          jugador2_id,
          categoria_id,
          numero_pareja,
          cabeza_serie
        )
        VALUES (
          ${torneoId},
          ${jugadores[i * 2]},
          ${jugadores[i * 2 + 1]},
          ${categoriaId},
          ${i + 1},
          ${i < 2}
        )
        RETURNING id
      `;
      parejas.push(parejaRows[0].id);
    }

    const zonas = [];
    const slotToPareja = {};

    for (const fixture of ZONE_FIXTURES) {
      const zonaRows = await sql`
        INSERT INTO zonas (
          fecha_torneo_id,
          categoria_id,
          nombre,
          estado
        )
        VALUES (
          ${torneoId},
          ${categoriaId},
          ${fixture.name},
          'finalizada'
        )
        RETURNING id
      `;
      const zonaId = zonaRows[0].id;
      zonas.push({ id: zonaId, name: fixture.name });

      for (const team of fixture.teams) {
        const parejaId = parejas[team.idx];
        slotToPareja[`${team.pos}${fixture.name.replace("Zona ", "")}`] = parejaId;
        await sql`
          INSERT INTO parejas_zona (
            zona_id,
            pareja_id,
            posicion_final,
            partidos_ganados,
            partidos_perdidos,
            sets_ganados,
            sets_perdidos,
            games_ganados,
            games_perdidos
          )
          VALUES (
            ${zonaId},
            ${parejaId},
            ${team.pos},
            ${team.stats.won},
            ${team.stats.lost},
            ${team.stats.setsWon},
            ${team.stats.setsLost},
            ${team.stats.gamesWon},
            ${team.stats.gamesLost}
          )
        `;
      }

      for (const match of fixture.matches) {
        await sql`
          INSERT INTO partidos_zona (
            zona_id,
            pareja1_id,
            pareja2_id,
            set1_pareja1,
            set1_pareja2,
            set2_pareja1,
            set2_pareja2,
            set3_pareja1,
            set3_pareja2,
            ganador_id,
            tipo_partido,
            estado,
            orden_partido,
            dia_partido,
            cancha_numero,
            fecha_hora_programada,
            hora_estimada
          )
          VALUES (
            ${zonaId},
            ${parejas[match.p1]},
            ${parejas[match.p2]},
            ${match.score[0]},
            ${match.score[1]},
            ${match.score[2]},
            ${match.score[3]},
            ${match.score[4] ?? null},
            ${match.score[5] ?? null},
            ${parejas[match.winner]},
            ${match.type},
            'finalizado',
            ${match.order},
            ${fixture.day},
            ${match.court},
            ${match.time.slice(0, 5)},
            ${match.time.slice(0, 5)}
          )
        `;
      }
    }

    const insertedMatches = [];
    for (const match of BRACKET_FIXTURE) {
      const pair1Id = match.source[0] ? slotToPareja[match.source[0]] || null : null;
      const pair2Id = match.source[1] ? slotToPareja[match.source[1]] || null : null;
      const rows = await sql`
        INSERT INTO llaves (
          fecha_torneo_id,
          categoria_id,
          ronda,
          posicion,
          pareja1_id,
          pareja2_id,
          p1_seed,
          p2_seed,
          estado
        )
        VALUES (
          ${torneoId},
          ${categoriaId},
          ${match.ronda},
          ${match.posicion},
          ${pair1Id},
          ${pair2Id},
          ${match.p1Seed},
          ${match.p2Seed},
          'pendiente'
        )
        RETURNING id
      `;
      insertedMatches.push({ ...match, id: rows[0].id });
    }

    const findMatchId = (ronda, posicion) =>
      insertedMatches.find((m) => m.ronda === ronda && m.posicion === posicion)?.id;

    await sql`
      UPDATE llaves
      SET siguiente_llave_id = ${findMatchId("semis", 2)}, siguiente_llave_slot = 1
      WHERE id = ${findMatchId("4tos", 1)}
    `;
    await sql`
      UPDATE llaves
      SET siguiente_llave_id = ${findMatchId("semis", 1)}, siguiente_llave_slot = 2
      WHERE id = ${findMatchId("4tos", 2)}
    `;
    await sql`
      UPDATE llaves
      SET siguiente_llave_id = ${findMatchId("final", 1)}, siguiente_llave_slot = 1
      WHERE id = ${findMatchId("semis", 1)}
    `;
    await sql`
      UPDATE llaves
      SET siguiente_llave_id = ${findMatchId("final", 1)}, siguiente_llave_slot = 2
      WHERE id = ${findMatchId("semis", 2)}
    `;

    console.log(JSON.stringify({
      ok: true,
      torneoId,
      categoriaId,
      marker: token,
      zonas: zonas.map((z) => ({ id: z.id, nombre: z.name })),
      llaves: insertedMatches.map((m) => ({ id: m.id, ronda: m.ronda, posicion: m.posicion })),
      cleanup: `node scripts/create-test-bracket-tournament.js cleanup --torneo=${torneoId}`,
    }, null, 2));
  } catch (error) {
    if (torneoId) {
      await cleanupTournamentById(torneoId);
    }
    throw error;
  }
}

async function cleanupTournamentById(torneoId) {
  const zonasRows = await sql`
    SELECT id FROM zonas WHERE fecha_torneo_id = ${torneoId}
  `;
  const zonasIds = zonasRows.map((row) => row.id);

  const parejasRows = await sql`
    SELECT id, jugador1_id, jugador2_id
    FROM parejas_torneo
    WHERE fecha_torneo_id = ${torneoId}
  `;
  const parejaIds = parejasRows.map((row) => row.id);
  const jugadorIds = [...new Set(parejasRows.flatMap((row) => [row.jugador1_id, row.jugador2_id]))];

  await sql`DELETE FROM llaves WHERE fecha_torneo_id = ${torneoId}`;

  if (zonasIds.length > 0) {
    for (const zonaId of zonasIds) {
      await sql`DELETE FROM partidos_zona WHERE zona_id = ${zonaId}`;
      await sql`DELETE FROM parejas_zona WHERE zona_id = ${zonaId}`;
    }
    await sql`DELETE FROM zonas WHERE fecha_torneo_id = ${torneoId}`;
  }

  if (parejaIds.length > 0) {
    await sql`DELETE FROM parejas_torneo WHERE fecha_torneo_id = ${torneoId}`;
  }

  await sql`DELETE FROM fechas_torneo WHERE id = ${torneoId}`;

  if (jugadorIds.length > 0) {
    for (const jugadorId of jugadorIds) {
      await sql`DELETE FROM jugadores WHERE id = ${jugadorId}`;
    }
  }
}

async function cleanupTournament() {
  const torneoId = Number(getArg("torneo"));
  if (!torneoId) {
    throw new Error("Debes indicar --torneo=<id> para borrar el torneo de prueba");
  }

  await cleanupTournamentById(torneoId);

  console.log(JSON.stringify({ ok: true, torneoId, deleted: true }, null, 2));
}

async function run() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL no esta definida en .env.local");
  }

  if (getMode() === "cleanup") {
    await cleanupTournament();
    return;
  }

  await createTournament();
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
