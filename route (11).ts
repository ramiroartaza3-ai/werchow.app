import { NextResponse, type NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabase/server'
import { getPerfil } from '@/lib/perfil'
import { mesActual, nombreArea } from '@/lib/indicadores'
import { BOM, ETIQUETA_TIPO, TIPOS_POR_AREA, baseValida, csv, mesValido, minutosEntre, nombreMes, num, puedeVerFicha } from '@/lib/reportes'
import { cargarFicha } from '@/lib/ficha'
import { etiquetaCorta, etiquetaDia } from '@/lib/fechas'

export async function GET(req: NextRequest) {
  const perfil = await getPerfil()
  const sp = req.nextUrl.searchParams
  const area = sp.get('area') ?? ''
  if (!TIPOS_POR_AREA[area]) return new NextResponse('No encontrado', { status: 404 })
  if (!puedeVerFicha(perfil.rol, perfil.areas, area)) return new NextResponse('Sin permiso', { status: 403 })

  const mes = mesValido(sp.get('mes')) ? sp.get('mes')! : mesActual()
  const base = baseValida(sp.get('base'))
  const ficha = await cargarFicha(supabaseServer(), area, mes, base)
  const tipos = TIPOS_POR_AREA[area]
  const horas = (min: number) => num(min / 60)

  const filas: (string | number | null)[][] = [
    [`Ficha de horarios de ${nombreArea(area)}`, nombreMes(mes)],
    ['Criterio', base === 'cumplido' ? 'Solo lo marcado como cumplido' : 'Todo lo programado'],
    ['Asignaciones cargadas', ficha.programadas, 'Cumplidas', ficha.cumplidas, 'Sin confirmar', ficha.sinConfirmar], [],
    ['COBERTURA DEL MES'],
    ['Tipo', 'Horas totales', 'Días cubiertos', 'Días del mes', '% de días cubiertos', 'Personas por día cubierto', 'Días sin cobertura'],
    ...ficha.cobertura.map((c) => [
      ETIQUETA_TIPO[c.tipo].plural, horas(c.minutos), c.diasCubiertos, c.diasMes,
      num((c.diasCubiertos / c.diasMes) * 100, 1), num(c.promedioPersonas, 1),
      c.sinCobertura.map(etiquetaCorta).join(' '),
    ]), [],
    ['RESUMEN POR PERSONA'],
    ['Persona', ...tipos.map((t) => ETIQUETA_TIPO[t].plural), ...tipos.map((t) => `Horas de ${ETIQUETA_TIPO[t].plural.toLowerCase()}`), 'Total de horas', 'Cambios'],
    ...ficha.personas.map((p) => [
      p.persona,
      ...tipos.map((t) => p.porTipo[t]?.cant ?? 0),
      ...tipos.map((t) => horas(p.porTipo[t]?.minutos ?? 0)),
      horas(p.minutosTotal), p.cambios,
    ]), [],
    ['DETALLE DÍA POR DÍA'],
    ['Fecha', 'Día', 'Tipo', 'Persona', 'Desde', 'Hasta', 'Horas', 'Cambio', 'Cumplido', 'Observaciones'],
    ...ficha.filas.map((f) => [
      f.fecha, etiquetaDia(f.fecha).split(' ')[0], ETIQUETA_TIPO[f.tipo].singular, f.persona,
      f.hora_desde.slice(0, 5), f.hora_hasta.slice(0, 5), horas(minutosEntre(f.hora_desde, f.hora_hasta)),
      f.es_cambio ? 'Sí' : '', f.cumplido ? 'Sí' : 'No', f.observaciones ?? '',
    ]),
  ]

  return new NextResponse(BOM + csv(filas), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="ficha-horarios-${area}-${mes}-${base}.csv"`,
    },
  })
}
