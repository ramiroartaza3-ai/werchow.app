import Link from 'next/link'
import { notFound } from 'next/navigation'
import { supabaseServer } from '@/lib/supabase/server'
import { getPerfil, areasVisibles } from '@/lib/perfil'
import { INDICADORES, calcular, formatear, mesActual, mesAnterior, nombreArea } from '@/lib/indicadores'
import { mesValido, nombreMes } from '@/lib/reportes'
import { cargarObjetivos, filasDe, detalleRatio } from '@/lib/objetivos-datos'
import GraficosArea from '@/components/graficos/GraficosArea'
import BotonImprimir from '@/components/graficos/BotonImprimir'
import '../../panel/panel.css'

export default async function ReporteObjetivos({ searchParams }: { searchParams: { area?: string; mes?: string } }) {
  const perfil = await getPerfil()
  if (perfil.rol === 'usuario') notFound()

  const mes = mesValido(searchParams.mes) ? searchParams.mes : mesActual()
  const previo = mesAnterior(mes)
  const visibles = areasVisibles(perfil).filter((a) => INDICADORES[a])
  const areas = searchParams.area ? visibles.filter((a) => a === searchParams.area) : visibles
  if (!areas.length) notFound()

  const { meses, datos } = await cargarObjetivos(supabaseServer(), areas, mes)
  const qs = `${searchParams.area ? `area=${searchParams.area}&` : ''}mes=${mes}`

  return (
    <>
      <div className="barra no-imprimir">
        <div><h1>Reporte mensual de objetivos</h1><div className="suave">Podés descargarlo en Excel o guardarlo como PDF desde la impresión.</div></div>
        <form method="get" style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}>
          {searchParams.area && <input type="hidden" name="area" value={searchParams.area} />}
          <label htmlFor="mes" className="suave" style={{ margin: 0 }}>Mes</label>
          <input id="mes" type="month" name="mes" defaultValue={mes} />
          <button type="submit" className="secundario">Ver</button>
        </form>
      </div>
      <div className="acciones-rep no-imprimir" style={{ marginBottom: '1rem' }}>
        <a href={`/reportes/objetivos/csv?${qs}`} download>Descargar Excel (CSV)</a>
        <BotonImprimir />
        <Link href={`/panel?mes=${mes}`}>Volver al panel</Link>
      </div>

      <div className="encabezado-reporte">
        <h1>Werchow · Reporte de objetivos</h1>
        <div className="suave">{nombreMes(mes)}</div>
      </div>

      {areas.map((area) => (
        <section className="area" key={area} style={{ marginBottom: '1.25rem' }}>
          <h2>{nombreArea(area)}</h2>
          <div className="ficha-tabla">
            <table>
              <thead><tr><th>Indicador</th><th className="num">{nombreMes(mes)}</th><th className="num">Mes anterior</th><th>Detalle</th></tr></thead>
              <tbody>
                {INDICADORES[area].map((ind) => {
                  const actual = filasDe(datos, area, mes)
                  const vehiculos = ind.porVehiculo
                    ? actual.filter((f) => f.indicador === ind.clave && f.detalle).map((f) => `${f.detalle}: ${f.valor}`).join(' · ')
                    : ''
                  return (
                    <tr key={ind.clave}>
                      <td>{ind.etiqueta}</td>
                      <td className="num">{formatear(ind, calcular(ind, actual))}</td>
                      <td className="num var">{formatear(ind, calcular(ind, filasDe(datos, area, previo)))}</td>
                      <td className="suave">{detalleRatio(ind, actual) || vehiculos}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <GraficosArea area={area} meses={meses} datos={datos} />
        </section>
      ))}
    </>
  )
}
