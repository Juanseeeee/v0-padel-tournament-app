import { sql, type FechaTorneo } from "@/lib/db"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { CalendarioView } from "./calendario-view"

export const dynamic = "force-dynamic"
export const revalidate = 0

async function getFechasTorneo(): Promise<FechaTorneo[]> {
  const result = await sql`
    SELECT f.*, c.nombre as categoria_nombre
    FROM fechas_torneo f
    LEFT JOIN categorias c ON f.categoria_id = c.id
    ORDER BY f.fecha_calendario DESC NULLS LAST, f.temporada DESC, f.numero_fecha DESC
  `
  return result as FechaTorneo[]
}

export default async function CalendarioPage() {
  const fechas = await getFechasTorneo()

  const proximasFechas = fechas.filter(f => f.estado === 'programada' || f.estado === 'en_juego')
  const fechasPasadas = fechas.filter(f => f.estado === 'finalizada')

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      
      <main className="flex-1">
        <CalendarioView proximasFechas={proximasFechas} fechasPasadas={fechasPasadas} />
      </main>

      <Footer />
    </div>
  )
}
