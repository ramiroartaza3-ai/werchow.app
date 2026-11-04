'use server'
import { revalidatePath } from 'next/cache'
import { supabaseServer } from '@/lib/supabase/server'
import { INDICADORES } from '@/lib/indicadores'

type Item = { indicador: string; detalle: string; valor: number }

export async function guardarObjetivos(area: string, mes: string, items: Item[]) {
  if (!INDICADORES[area] || !/^\d{4}-\d{2}$/.test(mes)) return { ok: false, mensaje: 'Datos inválidos.' }
  const supabase = supabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, mensaje: 'Sesión vencida. Volvé a ingresar.' }

  const periodo = `${mes}-01`
  const validos = items.filter((i) => Number.isFinite(i.valor))
  const filas = validos.map((i) => ({
    area, periodo, indicador: i.indicador, detalle: i.detalle ?? '', valor: i.valor,
    cargado_por: user.id, actualizado_en: new Date().toISOString(),
  }))

  if (filas.length) {
    const { error } = await supabase.from('objetivos_mensuales').upsert(filas, { onConflict: 'area,periodo,indicador,detalle' })
    if (error) return { ok: false, mensaje: 'No se pudo guardar. Revisá que tengas permiso para esta área.' }
  }

  // Quita vehículos que ya no están en la lista
  for (const ind of INDICADORES[area].filter((i) => i.porVehiculo)) {
    const { data: existentes } = await supabase.from('objetivos_mensuales').select('detalle')
      .eq('area', area).eq('periodo', periodo).eq('indicador', ind.clave)
    const quedan = new Set(validos.filter((v) => v.indicador === ind.clave).map((v) => v.detalle))
    const borrar = (existentes ?? []).map((e) => e.detalle).filter((d) => !quedan.has(d))
    if (borrar.length) {
      await supabase.from('objetivos_mensuales').delete()
        .eq('area', area).eq('periodo', periodo).eq('indicador', ind.clave).in('detalle', borrar)
    }
  }

  revalidatePath('/panel')
  return { ok: true, mensaje: 'Objetivos guardados.' }
}
