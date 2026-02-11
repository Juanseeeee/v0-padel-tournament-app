import { sql, type FechaTorneo } from "@/lib/db"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { CalendarioView } from "./calendario-view"

async function getFechasTorneo(): Promise<FechaTorneo[]> {
  const result = await sql`
    SELECT * FROM fechas_torneo 
    ORDER BY fecha_calendario DESC
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
