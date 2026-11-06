import Link from 'next/link'
import { redirect } from 'next/navigation'
import { supabaseServer } from '@/lib/supabase/server'
import { getPerfil } from '@/lib/perfil'
import { AREAS, INDICADORES, calcular, formatear, mesActual, mesAnterior, nombreArea, type Fila } from '@/lib/indicadores'
import './inicio.css'

// Accesos a la información de cada área
const ACCESOS: Record<string, { href: string; texto: string }[]> = {
  sepelio: [
    { href: '/sepelio/procedimiento', texto: 'Procedimiento administrativo' },
    { href: '/sepelio/calendario/turnos', texto: 'Turnos' },
    { href: '/sepelio/calendario/guardias', texto: 'Guardias' },
  ],
  ventas: [{ href: '/ventas/guia', texto: 'Guía de gestión de ventas' }],
  salud: [{ href: '/salud/calendario', texto: 'Horarios' }],
  administracion: [
    { href: '/rrhh/politicas', texto: 'Políticas de la empresa' },
    { href: '/rrhh/plan-carrera', texto: 'Plan de carrera' },
    { href: '/rrhh/induccion', texto: 'Planes de inducción' },
  ],
}

const nombreMes = (mes: string) => new Date(`${mes}-15`).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })

export default async function Inicio() {
  const perfil = await getPerfil()
  if (perfil.rol !== 'usuario') redirect('/panel')

  const areas = AREAS.map((a) => a.clave as string).filter((a) => perfil.areas.includes(a))
  const conIndicadores = areas.filter((a) => INDICADORES[a])
  const mes = mesActual()
  const previo = mesAnterior(mes)

  const { data } = conIndicadores.length
    ? await supabaseServer().from('objetivos_mensuales')
        .select('area, periodo, indicador, detalle, valor')
        .in('periodo', [`${mes}-01`, `${previo}-01`]).in('area', conIndicadores)
    : { data: [] }

  const filas = (area: string, m: string): Fila[] =>
    (data ?? []).filter((f) => f.area === area && f.periodo === `${m}-01`) as Fila[]

  return (
    <>
      <div className="barra">
        <div>
          <h1>Hola{perfil.nombre ? `, ${perfil.nombre.split(' ')[0]}` : ''}</h1>
          <div className="suave">Resumen informativo de {nombreMes(mes)}</div>
        </div>
      </div>

      {areas.length === 0 && <p>Todavía no tenés áreas asignadas. Consultá con el administrador.</p>}

      <div className="areas">
        {areas.map((area) => (
          <section className="area" key={area}>
            <h2>{nombreArea(area)}</h2>
            {INDICADORES[area] && (
              <div className="resumen">
                {INDICADORES[area].filter((i) => i.resumen).map((ind) => (
                  <div className="dato" key={ind.clave}>
                    <div className="valor">{formatear(ind, calcular(ind, filas(area, mes)))}</div>
                    <div className="nombre">{ind.etiqueta}</div>
                    <div className="previo">Mes anterior: {formatear(ind, calcular(ind, filas(area, previo)))}</div>
                  </div>
                ))}
              </div>
            )}
            {ACCESOS[area] && (
              <nav className="accesos" aria-label={`Información de ${nombreArea(area)}`}>
                {ACCESOS[area].map((a) => <Link key={a.href} href={a.href}>{a.texto}</Link>)}
              </nav>
            )}
          </section>
        ))}
      </div>
    </>
  )
}
