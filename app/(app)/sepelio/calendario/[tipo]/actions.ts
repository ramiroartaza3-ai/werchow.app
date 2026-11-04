'use server'
import { revalidatePath } from 'next/cache'
import { supabaseServer } from '@/lib/supabase/server'
import { valida, sumarDias } from '@/lib/fechas'

type Resultado = { ok: boolean; mensaje: string }
export type AsignacionInput = {
  id?: number; tipo: 'turno' | 'guardia'; fecha: string; persona: string
  hora_desde: string; hora_hasta: string; es_cambio: boolean; observaciones: string
}

const ruta = (tipo: string) => `/sepelio/calendario/${tipo === 'turno' ? 'turnos' : 'guardias'}`
const horaOk = (h: string) => /^\d{2}:\d{2}/.test(h)

export async function guardarAsignacion(a: AsignacionInput): Promise<Resultado> {
  if (!['turno', 'guardia'].includes(a.tipo) || !valida(a.fecha)) return { ok: false, mensaje: 'Datos inválidos.' }
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
    : await supabase.from('asignaciones').insert({ ...datos, area: 'sepelio', tipo: a.tipo, creado_por: user.id })
  if (error) return { ok: false, mensaje: 'No se pudo guardar. Revisá que tengas permiso para cargar el calendario.' }

  revalidatePath(ruta(a.tipo))
  return { ok: true, mensaje: a.id ? 'Cambio guardado.' : 'Asignación agregada.' }
}

export async function borrarAsignacion(id: number, tipo: 'turno' | 'guardia'): Promise<Resultado> {
  const { error } = await supabaseServer().from('asignaciones').delete().eq('id', id)
  if (error) return { ok: false, mensaje: 'No se pudo quitar la asignación.' }
  revalidatePath(ruta(tipo))
  return { ok: true, mensaje: 'Asignación quitada.' }
}

// Copia las asignaciones de la semana anterior a la semana indicada (si está vacía)
export async function copiarSemana(tipo: 'turno' | 'guardia', lunesDestino: string): Promise<Resultado> {
  if (!valida(lunesDestino)) return { ok: false, mensaje: 'Semana inválida.' }
  const supabase = supabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, mensaje: 'Sesión vencida. Volvé a ingresar.' }

  const destino = await supabase.from('asignaciones').select('id', { count: 'exact', head: true })
    .eq('area', 'sepelio').eq('tipo', tipo).gte('fecha', lunesDestino).lte('fecha', sumarDias(lunesDestino, 6))
  if ((destino.count ?? 0) > 0) return { ok: false, mensaje: 'Esta semana ya tiene asignaciones. Solo se puede copiar sobre una semana vacía.' }

  const origen = sumarDias(lunesDestino, -7)
  const { data } = await supabase.from('asignaciones')
    .select('fecha, persona, hora_desde, hora_hasta')
    .eq('area', 'sepelio').eq('tipo', tipo).gte('fecha', origen).lte('fecha', sumarDias(origen, 6))
  if (!data?.length) return { ok: false, mensaje: 'La semana anterior no tiene asignaciones para copiar.' }

  const filas = data.map((f) => ({
    area: 'sepelio', tipo, fecha: sumarDias(f.fecha, 7), persona: f.persona,
    hora_desde: f.hora_desde, hora_hasta: f.hora_hasta, creado_por: user.id, modificado_por: user.id,
  }))
  const { error } = await supabase.from('asignaciones').insert(filas)
  if (error) return { ok: false, mensaje: 'No se pudo copiar la semana.' }
  revalidatePath(ruta(tipo))
  return { ok: true, mensaje: `Se copiaron ${filas.length} asignaciones.` }
}
