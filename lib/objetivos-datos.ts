import type { supabaseServer } from '@/lib/supabase/server'
import { calcular, type Fila, type Indicador } from '@/lib/indicadores'
import { mesesDelAnio, mesesHasta } from '@/lib/reportes'

export type FilaObj = Fila & { area: string; periodo: string }

// Trae los datos de las áreas indicadas: los últimos 6 meses y lo que va del año, hasta `mes`
export async function cargarObjetivos(supabase: ReturnType<typeof supabaseServer>, areas: string[], mes: string) {
  const meses = mesesHasta(mes, 6)
  const anio = mesesDelAnio(mes)
  const desde = [meses[0], anio[0]].sort()[0]
  const { data } = await supabase.from('objetivos_mensuales')
    .select('area, periodo, indicador, detalle, valor')
    .gte('periodo', `${desde}-01`).lte('periodo', `${mes}-01`).in('area', areas)
  const datos = (data ?? []).map((f) => ({ ...f, valor: Number(f.valor) })) as FilaObj[]
  return { meses, anio, datos }
}

// Acumulado de enero al mes elegido: suma las cantidades y los montos, promedia los porcentajes
// y calcula los ratios sobre el total acumulado
export const acumuladoDe = (ind: Indicador, datos: FilaObj[], area: string, anio: string[]) =>
  calcular(ind, datos.filter((f) => f.area === area && anio.some((m) => f.periodo === `${m}-01`)))

export const filasDe = (datos: FilaObj[], area: string, mes: string): Fila[] =>
  datos.filter((f) => f.area === area && f.periodo === `${mes}-01`)

export const serieDe = (ind: Indicador, datos: FilaObj[], area: string, meses: string[]) =>
  meses.map((m) => calcular(ind, filasDe(datos, area, m)))

// Para indicadores de tipo "ratio": texto con los dos números que dan el porcentaje
export function detalleRatio(ind: Indicador, filas: Fila[]): string {
  if (ind.tipo !== 'ratio') return ''
  const suma = (k: string) => {
    const f = filas.filter((x) => x.indicador === k)
    return f.length ? f.reduce((s, x) => s + Number(x.valor), 0) : null
  }
  const n = suma(`${ind.clave}__num`)
  const d = suma(`${ind.clave}__den`)
  if (n === null || d === null) return ''
  return `${ind.numLabel}: ${n} · ${ind.denLabel}: ${d}`
}
