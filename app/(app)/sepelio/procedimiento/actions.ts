'use server'
import { revalidatePath } from 'next/cache'
import { supabaseServer } from '@/lib/supabase/server'

type Enlace = { texto: string; url: string }
export type PasoInput = {
  id?: number; titulo: string; descripcion: string; tipo: 'paso' | 'decision'
  si_texto: string; no_texto: string; enlaces: Enlace[]
}
type Resultado = { ok: boolean; mensaje: string }

const RUTA = '/sepelio/procedimiento'
const urlOk = (u: string) => /^https?:\/\//i.test(u) || u.startsWith('/')

export async function guardarPaso(p: PasoInput): Promise<Resultado> {
  if (!p.titulo.trim()) return { ok: false, mensaje: 'El título es obligatorio.' }
  const enlaces = p.enlaces
    .filter((e) => e.url.trim())
    .map((e) => ({ texto: e.texto.trim() || e.url.trim(), url: e.url.trim() }))
  if (enlaces.some((e) => !urlOk(e.url))) {
    return { ok: false, mensaje: 'Los enlaces deben empezar con https:// o con /' }
  }
  const supabase = supabaseServer()
  const datos = {
    titulo: p.titulo.trim(),
    descripcion: p.descripcion.trim(),
    tipo: p.tipo,
    si_texto: p.tipo === 'decision' ? p.si_texto.trim() || null : null,
    no_texto: p.tipo === 'decision' ? p.no_texto.trim() || null : null,
    enlaces,
    actualizado_en: new Date().toISOString(),
  }
  if (p.id) {
    const { error } = await supabase.from('pasos_procedimiento').update(datos).eq('id', p.id)
    if (error) return { ok: false, mensaje: 'No se pudo guardar el paso.' }
  } else {
    const { data: ult } = await supabase.from('pasos_procedimiento').select('orden')
      .eq('area', 'sepelio').order('orden', { ascending: false }).limit(1)
    const orden = (ult?.[0]?.orden ?? 0) + 1
    const { error } = await supabase.from('pasos_procedimiento').insert({ ...datos, area: 'sepelio', orden })
    if (error) return { ok: false, mensaje: 'No se pudo crear el paso.' }
  }
  revalidatePath(RUTA)
  return { ok: true, mensaje: 'Paso guardado.' }
}

export async function borrarPaso(id: number): Promise<Resultado> {
  const { error } = await supabaseServer().from('pasos_procedimiento').delete().eq('id', id)
  if (error) return { ok: false, mensaje: 'No se pudo eliminar el paso.' }
  revalidatePath(RUTA)
  return { ok: true, mensaje: 'Paso eliminado.' }
}

export async function moverPaso(id: number, dir: 'arriba' | 'abajo'): Promise<Resultado> {
  const supabase = supabaseServer()
  const { data } = await supabase.from('pasos_procedimiento').select('id, orden')
    .eq('area', 'sepelio').order('orden')
  const lista = data ?? []
  const i = lista.findIndex((p) => p.id === id)
  const j = dir === 'arriba' ? i - 1 : i + 1
  if (i < 0 || j < 0 || j >= lista.length) return { ok: true, mensaje: '' }
  await supabase.from('pasos_procedimiento').update({ orden: lista[j].orden }).eq('id', lista[i].id)
  await supabase.from('pasos_procedimiento').update({ orden: lista[i].orden }).eq('id', lista[j].id)
  revalidatePath(RUTA)
  return { ok: true, mensaje: '' }
}
