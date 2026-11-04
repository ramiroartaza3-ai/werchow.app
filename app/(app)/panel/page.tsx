import { supabaseServer } from '@/lib/supabase/server'
import { getPerfil, areasVisibles } from '@/lib/perfil'
import { INDICADORES, calcular, formatear, mesActual, mesAnterior, nombreArea, type Fila } from '@/lib/indicadores'
import Link from 'next/link'

const nombreMes = (mes: string) =>
  new Date(`${mes}-15`).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })

export default async function Panel({ searchParams }: { searchParams: { mes?: string } }) {
  const perfil = await getPerfil()
  const mes = /^\d{4}-\d{2}$/.test(searchParams.mes ?? '') ? searchParams.mes! : mesActual()
  const previo = mesAnterior(mes)
  const areas = areasVisibles(perfil).filter((a) => INDICADORES[a])

  const supabase = supabaseServer()
  const { data } = await supabase
    .from('objetivos_mensuales')
    .select('area, periodo, indicador, detalle, valor')
    .in('periodo', [`${mes}-01`, `${previo}-01`])
    .in('area', areas)

  const filas = (area: string, m: string): Fila[] =>
    (data ?? []).filter((f) => f.area === area && f.periodo === `${m}-01`) as Fila[]

  return (
    <>
      <div className="barra">
        <div>
          <h1>Panel de objetivos</h1>
          <div className="suave">Mes: {nombreMes(mes)} · comparado con {nombreMes(previo)}</div>
        </div>
        <form method="get">
          <label htmlFor="mes" className="suave" style={{ margin: 0 }}>Cambiar mes</label>
          <input id="mes" type="month" name="mes" defaultValue={mes} />
          <button type="submit" className="secundario">Ver</button>
        </form>
      </div>

      {areas.length === 0 && <p>Todavía no tenés áreas asignadas. Consultá con el administrador.</p>}

      <div className="areas">
        {areas.map((area) => (
          <section className="area" key={area}>
            <header>
              <h2>{nombreArea(area)}</h2>
              <Link href={`/objetivos/${area}?mes=${mes}`}>Ver o cargar datos</Link>
            </header>
            <table>
              <thead>
                <tr><th>Indicador</th><th className="num">Este mes</th><th className="num">Mes anterior</th></tr>
              </thead>
              <tbody>
                {INDICADORES[area].map((ind) => {
                  const actual = calcular(ind, filas(area, mes))
                  const anterior = calcular(ind, filas(area, previo))
                  return (
                    <tr key={ind.clave}>
                      <td>{ind.etiqueta}</td>
                      <td className="num">{formatear(ind, actual)}</td>
                      <td className="num var">{formatear(ind, anterior)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </section>
        ))}
      </div>
    </>
  )
}
