import Link from 'next/link'
import { notFound } from 'next/navigation'
import { supabaseServer } from '@/lib/supabase/server'
import { getPerfil, areasVisibles } from '@/lib/perfil'
import { puedeCargar } from '@/lib/indicadores'
import { puedeVerFicha } from '@/lib/reportes'
import { hoy, lunesDe, sumarDias, valida, etiquetaDia, etiquetaCorta } from '@/lib/fechas'
import Semana, { type Asig } from '@/app/(app)/sepelio/calendario/[tipo]/Semana'

const formatoFechaHora = (s: string) =>
  new Date(s).toLocaleString('es-AR', { timeZone: 'America/Argentina/Jujuy', day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' })

export default async function CalendarioSemanal({ area, tipoDb, titulo, ayuda, responsable, semana }: {
  area: 'sepelio' | 'salud' | 'ventas'; tipoDb: 'turno' | 'guardia' | 'horario'
  titulo: string; ayuda: string; responsable: string; semana?: string
}) {
  const perfil = await getPerfil()
  if (!areasVisibles(perfil).includes(area)) notFound()

  const lunes = lunesDe(valida(semana) ? semana : hoy())
  const domingo = sumarDias(lunes, 6)
  const editable = puedeCargar(perfil.rol, perfil.areas, area)
  const supabase = supabaseServer()

  const [{ data: asig }, { data: nombres }, { data: hist }, { data: perfiles }] = await Promise.all([
    supabase.from('asignaciones').select('id, fecha, persona, hora_desde, hora_hasta, es_cambio, cumplido, observaciones')
      .eq('area', area).eq('tipo', tipoDb).gte('fecha', lunes).lte('fecha', domingo)
      .order('fecha').order('hora_desde'),
    supabase.from('asignaciones').select('persona').eq('area', area).order('fecha', { ascending: false }).limit(300),
    supabase.from('asignaciones_historial').select('id, accion, datos, usuario, en')
      .eq('area', area).eq('tipo', tipoDb).order('en', { ascending: false }).limit(15),
    supabase.from('perfiles').select('id, nombre'),
  ])

  const personas = Array.from(new Set((nombres ?? []).map((n) => n.persona))).sort()
  const dias = Array.from({ length: 7 }, (_, i) => { const f = sumarDias(lunes, i); return { fecha: f, etiqueta: etiquetaDia(f) } })
  const quien = (id: string | null) => (perfiles ?? []).find((p) => p.id === id)?.nombre ?? 'Alguien'
  const accion: Record<string, string> = { insert: 'agregó', update: 'modificó', delete: 'quitó' }

  return (
    <>
      <div className="barra"><div><h1>{titulo}</h1>
        <div className="suave">{ayuda}{editable ? '' : ` Solo lectura: la carga la hace el responsable de ${responsable}.`}</div></div></div>

      <div className="barra-semana">
        <Link href={`?semana=${sumarDias(lunes, -7)}`}>Semana anterior</Link>
        <span className="titulo">Del {etiquetaCorta(lunes)} al {etiquetaCorta(domingo)}</span>
        <Link href={`?semana=${sumarDias(lunes, 7)}`}>Semana siguiente</Link>
        <Link href="?">Esta semana</Link>
      </div>

      <Semana key={lunes} area={area} tipoDb={tipoDb} lunes={lunes} dias={dias} hoy={hoy()} editable={editable}
        asignaciones={(asig ?? []) as Asig[]} personas={personas} />

      {puedeVerFicha(perfil.rol, perfil.areas, area) && (
        <section className="area" style={{ marginBottom: '1.5rem' }}>
          <h2>Ficha mensual de horarios</h2>
          <p className="suave">Horas, coberturas y detalle del mes, para ver, imprimir o descargar en Excel. Cuenta lo que marques como “Cumplido” en el calendario.</p>
          <form action="/reportes/horarios" method="get" style={{ display: 'flex', gap: '.5rem', alignItems: 'end', flexWrap: 'wrap' }}>
            <input type="hidden" name="area" value={area} />
            <div className="campo" style={{ margin: 0 }}>
              <label htmlFor="mes-ficha">Mes</label>
              <input id="mes-ficha" type="month" name="mes" defaultValue={sumarDias(lunes, 3).slice(0, 7)} />
            </div>
            <button type="submit">Ver ficha del mes</button>
          </form>
        </section>
      )}

      <section className="area">
        <h2>Últimos cambios registrados</h2>
        {(hist ?? []).length === 0 ? <p className="vacio">Todavía no hay cambios registrados.</p> : (
          <ul className="historial">
            {(hist ?? []).map((h) => {
              const d = h.datos as { persona: string; fecha: string; hora_desde: string; hora_hasta: string; es_cambio: boolean; cumplido: boolean }
              return (
                <li key={h.id}>
                  {quien(h.usuario)} {accion[h.accion] ?? h.accion} a <b>{d.persona}</b> el {etiquetaCorta(d.fecha)} de {d.hora_desde.slice(0, 5)} a {d.hora_hasta.slice(0, 5)}
                  {d.es_cambio ? ' (cambio)' : ''}{d.cumplido ? ' · cumplido' : ''} <span className="suave">· {formatoFechaHora(h.en)}</span>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </>
  )
}
