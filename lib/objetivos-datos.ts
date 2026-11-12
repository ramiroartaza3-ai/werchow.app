import type { supabaseServer } from '@/lib/supabase/server'
import { calcular, type Fila, type Indicador } from '@/lib/indicadores'
import { mesesHasta } from '@/lib/reportes'

export type FilaObj = Fila & { area: string; periodo: string }

// Trae los últimos 6 meses (terminando en `mes`) de las áreas indicadas
export async function cargarObjetivos(supabase: ReturnType<typeof supabaseServer>, areas: string[], mes: string) {
  const meses = mesesHasta(mes, 6)
  const { data } = await supabase.from('objetivos_mensuales')
    .select('area, periodo, indicador, detalle, valor')
    .in('periodo', meses.map((m) => `${m}-01`)).in('area', areas)
  const datos = (data ?? []).map((f) => ({ ...f, valor: Number(f.valor) })) as FilaObj[]
  return { meses, datos }
}

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
