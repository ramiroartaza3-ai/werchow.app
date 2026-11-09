import Link from 'next/link'
import { redirect } from 'next/navigation'
import { supabaseServer } from '@/lib/supabase/server'
import { getPerfil, areasVisibles } from '@/lib/perfil'
import { INDICADORES, calcular, formatear, mesActual, mesAnterior, nombreArea } from '@/lib/indicadores'
import { ETIQUETA_TIPO, TIPOS_POR_AREA, horasTexto, mesValido, nombreMes, puedeVerFicha } from '@/lib/reportes'
import { cargarObjetivos, filasDe } from '@/lib/objetivos-datos'
import { cargarFicha } from '@/lib/ficha'
import GraficosArea from '@/components/graficos/GraficosArea'
import './panel.css'

export default async function Panel({ searchParams }: { searchParams: { mes?: string } }) {
  const perfil = await getPerfil()
  if (perfil.rol === 'usuario') redirect('/inicio')

  const mes = mesValido(searchParams.mes) ? searchParams.mes : mesActual()
  const previo = mesAnterior(mes)
  const areas = areasVisibles(perfil).filter((a) => INDICADORES[a])

  const supabase = supabaseServer()
  const { meses, datos } = areas.length ? await cargarObjetivos(supabase, areas, mes) : { meses: [], datos: [] }
  const fichas = Object.fromEntries(
    await Promise.all(areas.filter((a) => TIPOS_POR_AREA[a]).map(async (a) => [a, await cargarFicha(supabase, a, mes)] as const))
  )

  return (
    <>
      <div className="barra">
        <div>
          <h1>Panel de objetivos</h1>
          <div className="suave">Mes: {nombreMes(mes)} · los gráficos muestran los últimos 6 meses</div>
        </div>
        <form method="get">
          <label htmlFor="mes" className="suave" style={{ margin: 0 }}>Cambiar mes</label>
          <input id="mes" type="month" name="mes" defaultValue={mes} />
          <button type="submit" className="secundario">Ver</button>
        </form>
      </div>

      {areas.length === 0 && <p>Todavía no tenés áreas asignadas. Consultá con el administrador.</p>}
      {areas.length > 1 && (
        <p className="acciones-rep" style={{ marginBottom: '1rem' }}>
          <Link href={`/reportes/objetivos?mes=${mes}`}>Reporte del mes de todas las áreas</Link>
          <a href={`/reportes/objetivos/csv?mes=${mes}`} download>Descargar todas (Excel)</a>
        </p>
      )}

      <div className="areas">
        {areas.map((area) => {
          const ficha = fichas[area]
          return (
            <section className="area" key={area}>
              <header>
                <h2>{nombreArea(area)}</h2>
                <div className="acciones-rep">
                  <Link href={`/reportes/objetivos?area=${area}&mes=${mes}`}>Reporte del mes</Link>
                  <a href={`/reportes/objetivos/csv?area=${area}&mes=${mes}`} download>Descargar Excel</a>
                  {puedeVerFicha(perfil.rol, perfil.areas, area) && TIPOS_POR_AREA[area] && (
                    <Link href={`/reportes/horarios?area=${area}&mes=${mes}`}>Ficha de horarios</Link>
                  )}
                  <Link href={`/objetivos/${area}?mes=${mes}`}>Cargar datos</Link>
                </div>
              </header>

              {ficha && (
                <div className="cobertura" aria-label="Cobertura del mes">
                  {ficha.cobertura.map((c) => (
                    <span key={c.tipo}>{ETIQUETA_TIPO[c.tipo].plural} cumplidos: <b>{horasTexto(c.minutos)} h</b> · <b>{c.diasCubiertos}/{c.diasMes}</b> días cubiertos</span>
                  ))}
                  {ficha.sinConfirmar > 0 && <span className="suave">{ficha.sinConfirmar} sin confirmar</span>}
                </div>
              )}

              <GraficosArea area={area} meses={meses} datos={datos} />

              <details>
                <summary>Ver tabla de {nombreMes(mes)}</summary>
                <table>
                  <thead><tr><th>Indicador</th><th className="num">Este mes</th><th className="num">Mes anterior</th></tr></thead>
                  <tbody>
                    {INDICADORES[area].map((ind) => (
                      <tr key={ind.clave}>
                        <td>{ind.etiqueta}</td>
                        <td className="num">{formatear(ind, calcular(ind, filasDe(datos, area, mes)))}</td>
                        <td className="num var">{formatear(ind, calcular(ind, filasDe(datos, area, previo)))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
            </section>
          )
        })}
      </div>
    </>
  )
}
