import Link from 'next/link'
import { notFound } from 'next/navigation'
import { supabaseServer } from '@/lib/supabase/server'
import { getPerfil } from '@/lib/perfil'
import { mesActual, nombreArea } from '@/lib/indicadores'
import { ETIQUETA_TIPO, TIPOS_POR_AREA, baseValida, horasTexto, mesValido, nombreMes, puedeVerFicha } from '@/lib/reportes'
import { etiquetaCorta, etiquetaDia } from '@/lib/fechas'
import { cargarFicha } from '@/lib/ficha'
import BotonImprimir from '@/components/graficos/BotonImprimir'
import '../../panel/panel.css'

export default async function FichaHorarios({ searchParams }: { searchParams: { area?: string; mes?: string; base?: string } }) {
  const perfil = await getPerfil()
  const area = searchParams.area ?? ''
  if (!TIPOS_POR_AREA[area] || !puedeVerFicha(perfil.rol, perfil.areas, area)) notFound()

  const mes = mesValido(searchParams.mes) ? searchParams.mes : mesActual()
  const base = baseValida(searchParams.base)
  const ficha = await cargarFicha(supabaseServer(), area, mes, base)
  const tipos = TIPOS_POR_AREA[area]
  const qs = `area=${area}&mes=${mes}&base=${base}`

  return (
    <>
      <div className="barra no-imprimir">
        <div><h1>Ficha mensual de horarios</h1><div className="suave">Horas y coberturas según el calendario cargado, con los cambios registrados.</div></div>
        <form method="get" style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}>
          <input type="hidden" name="area" value={area} />
          <label htmlFor="mes" className="suave" style={{ margin: 0 }}>Mes</label>
          <input id="mes" type="month" name="mes" defaultValue={mes} />
          <label htmlFor="base" className="suave" style={{ margin: 0 }}>Contar</label>
          <select id="base" name="base" defaultValue={base} style={{ width: 'auto' }}>
            <option value="cumplido">Solo lo cumplido</option>
            <option value="programado">Todo lo programado</option>
          </select>
          <button type="submit" className="secundario">Ver</button>
        </form>
      </div>
      <div className="acciones-rep no-imprimir" style={{ marginBottom: '1rem' }}>
        <a href={`/reportes/horarios/csv?${qs}`} download>Descargar Excel (CSV)</a>
        <BotonImprimir />
        <Link href={`/panel?mes=${mes}`}>Volver al panel</Link>
      </div>

      <div className="encabezado-reporte">
        <h1>Werchow · Ficha de horarios de {nombreArea(area)}</h1>
        <div className="suave">{nombreMes(mes)}</div>
        <div className="suave">
          Criterio: {base === 'cumplido' ? 'solo las asignaciones marcadas como cumplidas' : 'todo lo programado, esté o no confirmado'}.
          {' '}{ficha.programadas} cargadas · {ficha.cumplidas} cumplidas · {ficha.sinConfirmar} sin confirmar.
        </div>
      </div>

      <section className="area" style={{ marginBottom: '1.25rem' }}>
        <h2>Cobertura del mes</h2>
        <div className="ficha-tabla">
          <table>
            <thead><tr><th>Tipo</th><th className="num">Horas totales</th><th className="num">Días cubiertos</th><th className="num">% de días</th><th className="num">Personas por día cubierto</th><th>Días sin cobertura</th></tr></thead>
            <tbody>
              {ficha.cobertura.map((c) => (
                <tr key={c.tipo}>
                  <td>{ETIQUETA_TIPO[c.tipo].plural}</td>
                  <td className="num">{horasTexto(c.minutos)} h</td>
                  <td className="num">{c.diasCubiertos} de {c.diasMes}</td>
                  <td className="num">{Math.round((c.diasCubiertos / c.diasMes) * 100)} %</td>
                  <td className="num">{c.promedioPersonas.toLocaleString('es-AR', { maximumFractionDigits: 1 })}</td>
                  <td className="suave">{c.sinCobertura.length ? c.sinCobertura.map(etiquetaCorta).join(', ') : 'Ninguno'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="area" style={{ marginBottom: '1.25rem' }}>
        <h2>Resumen por persona</h2>
        {ficha.personas.length === 0 ? <p className="vacio">{ficha.programadas > 0 && base === 'cumplido' ? 'Ninguna asignación del mes está marcada como cumplida. Marcalas en el calendario o elegí contar todo lo programado.' : 'No hay asignaciones cargadas en este mes.'}</p> : (
          <div className="ficha-tabla">
            <table>
              <thead><tr>
                <th>Persona</th>
                {tipos.map((t) => <th className="num" key={t}>{ETIQUETA_TIPO[t].plural}</th>)}
                {tipos.map((t) => <th className="num" key={`h${t}`}>Horas de {ETIQUETA_TIPO[t].plural.toLowerCase()}</th>)}
                <th className="num">Total de horas</th><th className="num">Cambios</th>
              </tr></thead>
              <tbody>
                {ficha.personas.map((p) => (
                  <tr key={p.persona}>
                    <td>{p.persona}</td>
                    {tipos.map((t) => <td className="num" key={t}>{p.porTipo[t]?.cant ?? 0}</td>)}
                    {tipos.map((t) => <td className="num" key={`h${t}`}>{horasTexto(p.porTipo[t]?.minutos ?? 0)}</td>)}
                    <td className="num"><b>{horasTexto(p.minutosTotal)}</b></td>
                    <td className="num">{p.cambios}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="area">
        <h2>Detalle día por día</h2>
        {ficha.filas.length === 0 ? <p className="vacio">Sin asignaciones.</p> : (
          <div className="ficha-tabla">
            <table>
              <thead><tr><th>Fecha</th><th>Tipo</th><th>Persona</th><th>Desde</th><th>Hasta</th><th className="num">Horas</th><th>Cambio</th><th>Cumplido</th><th>Observaciones</th></tr></thead>
              <tbody>
                {ficha.filas.map((f, i) => (
                  <tr key={i} style={base === 'cumplido' && !f.cumplido ? { opacity: 0.55 } : undefined}>
                    <td style={{ textTransform: 'capitalize' }}>{etiquetaDia(f.fecha)}</td>
                    <td>{ETIQUETA_TIPO[f.tipo].singular}</td>
                    <td>{f.persona}</td>
                    <td>{f.hora_desde.slice(0, 5)}</td><td>{f.hora_hasta.slice(0, 5)}</td>
                    <td className="num">{horasTexto(f.minutos)}</td>
                    <td>{f.es_cambio ? 'Sí' : ''}</td>
                    <td>{f.cumplido ? 'Sí' : 'No'}</td>
                    <td className="suave">{f.observaciones}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  )
}
