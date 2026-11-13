'use server'
import { revalidatePath } from 'next/cache'
import { supabaseServer } from '@/lib/supabase/server'
import { INDICADORES, mesEditable } from '@/lib/indicadores'

type Item = { indicador: string; detalle: string; valor: number }
type Resultado = { ok: boolean; mensaje: string }

async function contexto() {
  const supabase = supabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('perfiles').select('rol').eq('id', user.id).single()
  return { supabase, user, rol: (data?.rol as string | undefined) ?? 'usuario' }
}

const mesOk = (mes: string) => /^\d{4}-(0[1-9]|1[0-2])$/.test(mes)

export async function guardarObjetivos(area: string, mes: string, items: Item[]): Promise<Resultado> {
  if (!INDICADORES[area] || !mesOk(mes)) return { ok: false, mensaje: 'Datos inválidos.' }
  const ctx = await contexto()
  if (!ctx) return { ok: false, mensaje: 'Sesión vencida. Volvé a ingresar.' }
  if (ctx.rol !== 'admin' && !mesEditable(mes)) {
    return { ok: false, mensaje: 'Los meses anteriores solo los puede modificar el administrador.' }
  }
  const { supabase, user } = ctx

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

// Solo administrador: borra un indicador de un mes (incluye sus dos valores si es un porcentaje, o todos los vehículos)
export async function borrarIndicadorMes(area: string, mes: string, claves: string[]): Promise<Resultado> {
  if (!INDICADORES[area] || !mesOk(mes)) return { ok: false, mensaje: 'Datos inválidos.' }
  const ctx = await contexto()
  if (!ctx || ctx.rol !== 'admin') return { ok: false, mensaje: 'Solo el administrador puede borrar objetivos.' }
  const permitidas = new Set(INDICADORES[area].flatMap((i) => [i.clave, `${i.clave}__num`, `${i.clave}__den`]))
  if (!claves.length || claves.some((c) => !permitidas.has(c))) return { ok: false, mensaje: 'Datos inválidos.' }

  const { error } = await ctx.supabase.from('objetivos_mensuales').delete()
    .eq('area', area).eq('periodo', `${mes}-01`).in('indicador', claves)
  if (error) return { ok: false, mensaje: 'No se pudo borrar.' }
  revalidatePath('/panel')
  return { ok: true, mensaje: 'Dato borrado.' }
}

// Solo administrador: pasa todos los datos de un área de un mes a otro (por ejemplo, si se cargaron en el mes equivocado)
export async function moverObjetivosMes(area: string, desde: string, hasta: string): Promise<Resultado> {
  if (!INDICADORES[area] || !mesOk(desde) || !mesOk(hasta) || desde === hasta) return { ok: false, mensaje: 'Datos inválidos.' }
  const ctx = await contexto()
  if (!ctx || ctx.rol !== 'admin') return { ok: false, mensaje: 'Solo el administrador puede mover objetivos.' }
  const { error } = await ctx.supabase.from('objetivos_mensuales')
    .update({ periodo: `${hasta}-01`, actualizado_en: new Date().toISOString() })
    .eq('area', area).eq('periodo', `${desde}-01`)
  if (error) {
    return { ok: false, mensaje: error.code === '23505'
      ? 'El mes de destino ya tiene datos de esta área: borralos primero o elegí otro mes.'
      : 'No se pudo mover.' }
  }
  revalidatePath('/panel')
  return { ok: true, mensaje: 'Datos movidos.' }
}

// Solo administrador: borra todos los objetivos de un área en un mes
export async function borrarObjetivosMes(area: string, mes: string): Promise<Resultado> {
  if (!INDICADORES[area] || !mesOk(mes)) return { ok: false, mensaje: 'Datos inválidos.' }
  const ctx = await contexto()
  if (!ctx || ctx.rol !== 'admin') return { ok: false, mensaje: 'Solo el administrador puede borrar objetivos.' }
  const { error } = await ctx.supabase.from('objetivos_mensuales').delete()
    .eq('area', area).eq('periodo', `${mes}-01`)
  if (error) return { ok: false, mensaje: 'No se pudo borrar.' }
  revalidatePath('/panel')
  return { ok: true, mensaje: 'Se borraron todos los objetivos del mes.' }
}
