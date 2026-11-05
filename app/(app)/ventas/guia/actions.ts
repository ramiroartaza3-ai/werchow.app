'use server'
import { revalidatePath } from 'next/cache'
import { supabaseServer } from '@/lib/supabase/server'

type Enlace = { texto: string; url: string }
export type SeccionInput = { id?: number; titulo: string; contenido: string; enlaces: Enlace[] }
type Resultado = { ok: boolean; mensaje: string }

const AREA = 'ventas'
const RUTA = '/ventas/guia'
const urlOk = (u: string) => /^https?:\/\//i.test(u) || u.startsWith('/')

export async function guardarSeccion(s: SeccionInput): Promise<Resultado> {
  if (!s.titulo.trim()) return { ok: false, mensaje: 'El título es obligatorio.' }
  const enlaces = s.enlaces.filter((e) => e.url.trim())
    .map((e) => ({ texto: e.texto.trim() || e.url.trim(), url: e.url.trim() }))
  if (enlaces.some((e) => !urlOk(e.url))) return { ok: false, mensaje: 'Los enlaces deben empezar con https:// o con /' }

  const supabase = supabaseServer()
  const datos = { titulo: s.titulo.trim(), contenido: s.contenido.trim(), enlaces, actualizado_en: new Date().toISOString() }
  if (s.id) {
    const { error } = await supabase.from('guias_secciones').update(datos).eq('id', s.id)
    if (error) return { ok: false, mensaje: 'No se pudo guardar la sección.' }
  } else {
    const { data: ult } = await supabase.from('guias_secciones').select('orden')
      .eq('area', AREA).order('orden', { ascending: false }).limit(1)
    const { error } = await supabase.from('guias_secciones').insert({ ...datos, area: AREA, orden: (ult?.[0]?.orden ?? 0) + 1 })
    if (error) return { ok: false, mensaje: 'No se pudo crear la sección.' }
  }
  revalidatePath(RUTA)
  return { ok: true, mensaje: 'Sección guardada.' }
}

export async function borrarSeccion(id: number): Promise<Resultado> {
  const { error } = await supabaseServer().from('guias_secciones').delete().eq('id', id)
  if (error) return { ok: false, mensaje: 'No se pudo eliminar la sección.' }
  revalidatePath(RUTA)
  return { ok: true, mensaje: 'Sección eliminada.' }
}

export async function moverSeccion(id: number, dir: 'arriba' | 'abajo'): Promise<Resultado> {
  const supabase = supabaseServer()
  const { data } = await supabase.from('guias_secciones').select('id, orden').eq('area', AREA).order('orden')
  const lista = data ?? []
  const i = lista.findIndex((p) => p.id === id)
  const j = dir === 'arriba' ? i - 1 : i + 1
  if (i < 0 || j < 0 || j >= lista.length) return { ok: true, mensaje: '' }
  await supabase.from('guias_secciones').update({ orden: lista[j].orden }).eq('id', lista[i].id)
  await supabase.from('guias_secciones').update({ orden: lista[i].orden }).eq('id', lista[j].id)
  revalidatePath(RUTA)
  return { ok: true, mensaje: '' }
}
