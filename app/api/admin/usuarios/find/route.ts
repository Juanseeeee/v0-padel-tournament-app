import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireAuth } from "@/lib/auth"

export async function GET(request: NextRequest) {
  const session = await requireAuth("admin")
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const email = (searchParams.get("email") || "").toLowerCase().trim()
    const localidad = searchParams.get("localidad") || ""

    if (!email) {
      return NextResponse.json({ error: "email requerido" }, { status: 400 })
    }

    const usuario = await sql`
      SELECT id, jugador_id, nombre, apellido, email, dni, telefono
      FROM usuarios
      WHERE email = ${email}
    `
    if (usuario.length === 0) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }
    const u = usuario[0]

    let candidatos: any[] = []
    const normNombre = String(u.nombre || "").toUpperCase().trim()
    const normApellido = String(u.apellido || "").toUpperCase().trim()

    const nombreUnaccent = (s: string) =>
      s.replace(/Á/g, "A").replace(/É/g, "E").replace(/Í/g, "I").replace(/Ó/g, "O").replace(/Ú/g, "U")
       .replace(/Ü/g, "U").replace(/Ñ/g, "N")
       .replace(/á/g, "a").replace(/é/g, "e").replace(/í/g, "i").replace(/ó/g, "o").replace(/ú/g, "u")
       .replace(/ü/g, "u").replace(/ñ/g, "n")

    const normNombreNoAccent = nombreUnaccent(normNombre)
    const normApellidoNoAccent = nombreUnaccent(normApellido)

    if (localidad) {
      candidatos = await sql`
        SELECT j.id, j.nombre, j.apellido, j.localidad, j.estado, j.puntos_totales, j.categoria_actual_id
        FROM jugadores j
        WHERE translate(UPPER(TRIM(j.nombre)), 'ÁÉÍÓÚÜÑáéíóúüñ', 'AEIOUUNaeiouun') = ${normNombreNoAccent}
          AND translate(UPPER(TRIM(j.apellido)), 'ÁÉÍÓÚÜÑáéíóúüñ', 'AEIOUUNaeiouun') = ${normApellidoNoAccent}
          AND j.localidad ILIKE ${`%${localidad}%`}
        ORDER BY j.estado DESC, j.created_at ASC
      `
      if (candidatos.length === 0) {
        candidatos = await sql`
          SELECT j.id, j.nombre, j.apellido, j.localidad, j.estado, j.puntos_totales, j.categoria_actual_id
          FROM jugadores j
          WHERE UPPER(j.nombre) ILIKE ${`%${normNombre}%`}
            AND UPPER(j.apellido) ILIKE ${`%${normApellido}%`}
            AND j.localidad ILIKE ${`%${localidad}%`}
          ORDER BY j.estado DESC, j.created_at ASC
          LIMIT 10
        `
      }
    } else {
      candidatos = await sql`
        SELECT j.id, j.nombre, j.apellido, j.localidad, j.estado, j.puntos_totales, j.categoria_actual_id
        FROM jugadores j
        WHERE translate(UPPER(TRIM(j.nombre)), 'ÁÉÍÓÚÜÑáéíóúüñ', 'AEIOUUNaeiouun') = ${normNombreNoAccent}
          AND translate(UPPER(TRIM(j.apellido)), 'ÁÉÍÓÚÜÑáéíóúüñ', 'AEIOUUNaeiouun') = ${normApellidoNoAccent}
        ORDER BY j.estado DESC, j.created_at ASC
        LIMIT 10
      `
      if (candidatos.length === 0) {
        candidatos = await sql`
          SELECT j.id, j.nombre, j.apellido, j.localidad, j.estado, j.puntos_totales, j.categoria_actual_id
          FROM jugadores j
          WHERE UPPER(j.nombre) ILIKE ${`%${normNombre}%`}
            AND UPPER(j.apellido) ILIKE ${`%${normApellido}%`}
          ORDER BY j.estado DESC, j.created_at ASC
          LIMIT 10
        `
      }
    }

    // Enrich candidatos with puntos por categoría
    const enriched = []
    for (const c of candidatos) {
      const puntosCat = await sql`
        SELECT c2.id as categoria_id, c2.nombre, COALESCE(pc.puntos_acumulados, 0) as puntos
        FROM categorias c2
        LEFT JOIN puntos_categoria pc ON pc.categoria_id = c2.id AND pc.jugador_id = ${c.id}
        ORDER BY c2.nombre ASC
      `
      enriched.push({
        ...c,
        puntos_por_categoria: puntosCat,
      })
    }

    return NextResponse.json({ usuario: u, candidatos: enriched })
  } catch (error: any) {
    return NextResponse.json({ error: String(error?.message || error) }, { status: 500 })
  }
}
