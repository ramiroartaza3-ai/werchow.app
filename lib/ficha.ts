import type { supabaseServer } from '@/lib/supabase/server'
import { diasDelMes, minutosEntre, TIPOS_POR_AREA, type BaseFicha, type TipoAsig } from '@/lib/reportes'

type Cliente = ReturnType<typeof supabaseServer>

export type FilaAsig = {
  fecha: string; tipo: TipoAsig; persona: string; hora_desde: string; hora_hasta: string
  es_cambio: boolean; cumplido: boolean; observaciones: string | null; minutos: number
}
export type ResumenPersona = {
  persona: string; porTipo: Record<string, { cant: number; minutos: number }>; cambios: number; minutosTotal: number
}
export type CoberturaTipo = {
  tipo: TipoAsig; diasMes: number; diasCubiertos: number; sinCobertura: string[]; minutos: number; promedioPersonas: number
}
export type Ficha = {
  area: string; mes: string; base: BaseFicha; filas: FilaAsig[]; personas: ResumenPersona[]; cobertura: CoberturaTipo[]
  programadas: number; cumplidas: number; sinConfirmar: number
}

export async function cargarFicha(supabase: Cliente, area: string, mes: string, base: BaseFicha = 'cumplido'): Promise<Ficha> {
  const dias = diasDelMes(mes)
  const tipos = TIPOS_POR_AREA[area] ?? []
  const { data } = await supabase.from('asignaciones')
    .select('fecha, tipo, persona, hora_desde, hora_hasta, es_cambio, cumplido, observaciones')
    .eq('area', area).gte('fecha', dias[0]).lte('fecha', dias[dias.length - 1])
    .order('fecha').order('hora_desde')

  const filas: FilaAsig[] = (data ?? []).map((f) => ({
    fecha: f.fecha, tipo: f.tipo as TipoAsig, persona: f.persona,
    hora_desde: f.hora_desde, hora_hasta: f.hora_hasta, es_cambio: f.es_cambio, cumplido: !!f.cumplido,
    observaciones: f.observaciones, minutos: minutosEntre(f.hora_desde, f.hora_hasta),
  }))

  // Las sumas y coberturas usan solo lo cumplido, o todo lo programado según la base elegida
  const contadas = base === 'cumplido' ? filas.filter((f) => f.cumplido) : filas
  const mapa = new Map<string, ResumenPersona>()
  for (const f of contadas) {
    let p = mapa.get(f.persona)
    if (!p) { p = { persona: f.persona, porTipo: {}, cambios: 0, minutosTotal: 0 }; mapa.set(f.persona, p) }
    if (!p.porTipo[f.tipo]) p.porTipo[f.tipo] = { cant: 0, minutos: 0 }
    p.porTipo[f.tipo].cant += 1
    p.porTipo[f.tipo].minutos += f.minutos
    p.minutosTotal += f.minutos
    if (f.es_cambio) p.cambios += 1
  }
  const personas = Array.from(mapa.values()).sort((a, b) => a.persona.localeCompare(b.persona, 'es'))

  const cobertura: CoberturaTipo[] = tipos.map((tipo) => {
    const delTipo = contadas.filter((f) => f.tipo === tipo)
    const cubiertos = new Set(delTipo.map((f) => f.fecha))
    const unicos = new Set(delTipo.map((f) => `${f.fecha}|${f.persona}`))
    return {
      tipo, diasMes: dias.length, diasCubiertos: cubiertos.size,
      sinCobertura: dias.filter((d) => !cubiertos.has(d)),
      minutos: delTipo.reduce((s, f) => s + f.minutos, 0),
      promedioPersonas: cubiertos.size ? unicos.size / cubiertos.size : 0,
    }
  })
  const cumplidas = filas.filter((f) => f.cumplido).length
  return { area, mes, base, filas, personas, cobertura, programadas: filas.length, cumplidas, sinConfirmar: filas.length - cumplidas }
}
