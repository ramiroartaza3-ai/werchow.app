'use server'
import { revalidatePath } from 'next/cache'
import { supabaseServer } from '@/lib/supabase/server'
import { valida, sumarDias } from '@/lib/fechas'

type Resultado = { ok: boolean; mensaje: string }
type Area = 'sepelio' | 'salud' | 'ventas'
type Tipo = 'turno' | 'guardia' | 'horario'
export type AsignacionInput = {
  id?: number; area: Area; tipo: Tipo; fecha: string; persona: string
  hora_desde: string; hora_hasta: string; es_cambio: boolean; observaciones: string
}

const COMBINACIONES: Record<Area, Tipo[]> = { sepelio: ['turno', 'guardia'], ventas: ['turno', 'guardia'], salud: ['horario'] }
const combinacionOk = (area: string, tipo: string) => COMBINACIONES[area as Area]?.includes(tipo as Tipo) ?? false
const ruta = (area: Area, tipo: Tipo) =>
  area === 'salud' ? '/salud/calendario' : `/${area}/calendario/${tipo === 'turno' ? 'turnos' : 'guardias'}`
const horaOk = (h: string) => /^\d{2}:\d{2}/.test(h)

export async function guardarAsignacion(a: AsignacionInput): Promise<Resultado> {
  if (!combinacionOk(a.area, a.tipo) || !valida(a.fecha)) return { ok: false, mensaje: 'Datos inválidos.' }
  if (!a.persona.trim()) return { ok: false, mensaje: 'Indicá la persona.' }
  if (!horaOk(a.hora_desde) || !horaOk(a.hora_hasta)) return { ok: false, mensaje: 'Completá el horario de inicio y de fin.' }

  const supabase = supabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, mensaje: 'Sesión vencida. Volvé a ingresar.' }

  const datos = {
    fecha: a.fecha, persona: a.persona.trim(),
    hora_desde: a.hora_desde, hora_hasta: a.hora_hasta,
    es_cambio: a.es_cambio, observaciones: a.observaciones.trim() || null,
    modificado_por: user.id, actualizado_en: new Date().toISOString(),
  }
  const { error } = a.id
    ? await supabase.from('asignaciones').update(datos).eq('id', a.id)
    : await supabase.from('asignaciones').insert({ ...datos, area: a.area, tipo: a.tipo, creado_por: user.id })
  if (error) return { ok: false, mensaje: 'No se pudo guardar. Revisá que tengas permiso para cargar el calendario.' }

  revalidatePath(ruta(a.area, a.tipo))
  return { ok: true, mensaje: a.id ? 'Cambio guardado.' : 'Asignación agregada.' }
}

export async function marcarCumplido(id: number, area: Area, tipo: Tipo, cumplido: boolean): Promise<Resultado> {
  if (!combinacionOk(area, tipo)) return { ok: false, mensaje: 'Datos inválidos.' }
  const supabase = supabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, mensaje: 'Sesión vencida. Volvé a ingresar.' }
  const ahora = new Date().toISOString()
  const { error } = await supabase.from('asignaciones').update({
    cumplido, validado_por: cumplido ? user.id : null, validado_en: cumplido ? ahora : null,
    modificado_por: user.id, actualizado_en: ahora,
  }).eq('id', id)
  if (error) return { ok: false, mensaje: 'No se pudo actualizar. Revisá que tengas permiso para validar.' }
  revalidatePath(ruta(area, tipo))
  revalidatePath('/panel')
  return { ok: true, mensaje: cumplido ? 'Marcado como cumplido.' : 'Validación quitada.' }
}

export async function borrarAsignacion(id: number, area: Area, tipo: Tipo): Promise<Resultado> {
  if (!combinacionOk(area, tipo)) return { ok: false, mensaje: 'Datos inválidos.' }
  const { error } = await supabaseServer().from('asignaciones').delete().eq('id', id)
  if (error) return { ok: false, mensaje: 'No se pudo quitar la asignación.' }
  revalidatePath(ruta(area, tipo))
  return { ok: true, mensaje: 'Asignación quitada.' }
}

// Copia las asignaciones de la semana anterior a la semana indicada (si está vacía)
export async function copiarSemana(area: Area, tipo: Tipo, lunesDestino: string): Promise<Resultado> {
  if (!combinacionOk(area, tipo) || !valida(lunesDestino)) return { ok: false, mensaje: 'Datos inválidos.' }
  const supabase = supabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, mensaje: 'Sesión vencida. Volvé a ingresar.' }

  const destino = await supabase.from('asignaciones').select('id', { count: 'exact', head: true })
    .eq('area', area).eq('tipo', tipo).gte('fecha', lunesDestino).lte('fecha', sumarDias(lunesDestino, 6))
  if ((destino.count ?? 0) > 0) return { ok: false, mensaje: 'Esta semana ya tiene asignaciones. Solo se puede copiar sobre una semana vacía.' }

  const origen = sumarDias(lunesDestino, -7)
  const { data } = await supabase.from('asignaciones')
    .select('fecha, persona, hora_desde, hora_hasta')
    .eq('area', area).eq('tipo', tipo).gte('fecha', origen).lte('fecha', sumarDias(origen, 6))
  if (!data?.length) return { ok: false, mensaje: 'La semana anterior no tiene asignaciones para copiar.' }

  const filas = data.map((f) => ({
    area, tipo, fecha: sumarDias(f.fecha, 7), persona: f.persona,
    hora_desde: f.hora_desde, hora_hasta: f.hora_hasta, creado_por: user.id, modificado_por: user.id,
  }))
  const { error } = await supabase.from('asignaciones').insert(filas)
  if (error) return { ok: false, mensaje: 'No se pudo copiar la semana.' }
  revalidatePath(ruta(area, tipo))
  return { ok: true, mensaje: `Se copiaron ${filas.length} asignaciones.` }
}
