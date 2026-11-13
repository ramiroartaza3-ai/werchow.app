import { NextResponse, type NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabase/server'
import { getPerfil, areasVisibles } from '@/lib/perfil'
import { INDICADORES, calcular, mesActual, mesAnterior, nombreArea } from '@/lib/indicadores'
import { BOM, csv, mesValido, num } from '@/lib/reportes'
import { acumuladoDe, cargarObjetivos, filasDe, detalleRatio } from '@/lib/objetivos-datos'

export async function GET(req: NextRequest) {
  const perfil = await getPerfil()
  if (perfil.rol === 'usuario') return new NextResponse('Sin permiso', { status: 403 })

  const sp = req.nextUrl.searchParams
  const mes = mesValido(sp.get('mes')) ? sp.get('mes')! : mesActual()
  const previo = mesAnterior(mes)
  const area = sp.get('area')
  const visibles = areasVisibles(perfil).filter((a) => INDICADORES[a])
  const areas = area ? visibles.filter((a) => a === area) : visibles
  if (!areas.length) return new NextResponse('No encontrado', { status: 404 })

  const { anio, datos } = await cargarObjetivos(supabaseServer(), areas, mes)
  const unidad = { numero: 'cantidad', monto: 'pesos', porcentaje: '%', ratio: '%' } as const

  const filas: (string | number | null)[][] = [['Área', 'Indicador', 'Unidad', 'Mes', 'Valor', 'Mes anterior', 'Detalle', `Acumulado ${mes.slice(0, 4)}`]]
  for (const a of areas) {
    const actual = filasDe(datos, a, mes)
    const anterior = filasDe(datos, a, previo)
    for (const ind of INDICADORES[a]) {
      filas.push([nombreArea(a), ind.etiqueta, unidad[ind.tipo], mes, num(calcular(ind, actual)), num(calcular(ind, anterior)), detalleRatio(ind, actual), num(acumuladoDe(ind, datos, a, anio))])
      if (ind.porVehiculo) {
        for (const f of actual.filter((x) => x.indicador === ind.clave && x.detalle)) {
          filas.push([nombreArea(a), `${ind.etiqueta} - ${f.detalle}`, unidad[ind.tipo], mes, num(Number(f.valor)), '', '', ''])
        }
      }
    }
  }

  return new NextResponse(BOM + csv(filas), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="objetivos-${area ?? 'todas'}-${mes}.csv"`,
    },
  })
}
