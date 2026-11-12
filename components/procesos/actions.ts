'use server'
import { revalidatePath } from 'next/cache'
import { supabaseServer } from '@/lib/supabase/server'
import { GRUPOS, type GrupoClave, type NodoInput } from '@/lib/procesos'

type Resultado = { ok: boolean; mensaje: string }
const urlOk = (u: string) => /^https?:\/\//i.test(u) || u.startsWith('/')

function hermanos(supabase: ReturnType<typeof supabaseServer>, grupo: string, padre: number | null) {
  const q = supabase.from('procesos').select('id, orden').eq('grupo', grupo)
  return (padre === null ? q.is('padre_id', null) : q.eq('padre_id', padre)).order('orden')
}

export async function guardarNodo(grupo: GrupoClave, n: NodoInput): Promise<Resultado> {
  const g = GRUPOS[grupo]
  if (!g) return { ok: false, mensaje: 'Datos inválidos.' }
  if (!n.titulo.trim()) return { ok: false, mensaje: 'El título es obligatorio.' }
  const enlaces = n.enlaces.filter((e) => e.url.trim())
    .map((e) => ({ texto: e.texto.trim() || e.url.trim(), url: e.url.trim() }))
  if (enlaces.some((e) => !urlOk(e.url))) return { ok: false, mensaje: 'Los enlaces deben empezar con https:// o con /' }

  const supabase = supabaseServer()
  const datos = {
    titulo: n.titulo.trim(),
    descripcion: n.descripcion.trim(),
    tipo: n.tipo,
    si_texto: n.tipo === 'decision' ? n.si_texto.trim() || null : null,
    no_texto: n.tipo === 'decision' ? n.no_texto.trim() || null : null,
    enlaces,
    finaliza: !!n.finaliza,
    actualizado_en: new Date().toISOString(),
  }
  if (n.id) {
    const { error } = await supabase.from('procesos').update(datos).eq('id', n.id).eq('grupo', grupo)
    if (error) return { ok: false, mensaje: 'No se pudo guardar.' }
  } else {
    const { data } = await hermanos(supabase, grupo, n.padre_id)
    const orden = (data ?? []).reduce((m, x) => Math.max(m, x.orden), 0) + 1
    const { error } = await supabase.from('procesos')
      .insert({ ...datos, area: g.area, grupo, padre_id: n.padre_id, orden })
    if (error) return { ok: false, mensaje: 'No se pudo crear. Revisá que tengas permiso para editar.' }
  }
  revalidatePath(g.ruta)
  return { ok: true, mensaje: 'Guardado.' }
}

export async function borrarNodo(grupo: GrupoClave, id: number): Promise<Resultado> {
  const g = GRUPOS[grupo]
  if (!g) return { ok: false, mensaje: 'Datos inválidos.' }
  // Los subprocesos se eliminan junto con su proceso (borrado en cascada en la base)
  const { error } = await supabaseServer().from('procesos').delete().eq('id', id).eq('grupo', grupo)
  if (error) return { ok: false, mensaje: 'No se pudo eliminar.' }
  revalidatePath(g.ruta)
  return { ok: true, mensaje: 'Eliminado.' }
}

export async function moverNodo(grupo: GrupoClave, id: number, dir: 'arriba' | 'abajo'): Promise<Resultado> {
  const g = GRUPOS[grupo]
  if (!g) return { ok: false, mensaje: 'Datos inválidos.' }
  const supabase = supabaseServer()
  const { data: nodo } = await supabase.from('procesos').select('id, padre_id').eq('id', id).single()
  if (!nodo) return { ok: false, mensaje: 'No se encontró el elemento.' }
  const { data } = await hermanos(supabase, grupo, nodo.padre_id)
  const lista = data ?? []
  const i = lista.findIndex((x) => x.id === id)
  const j = dir === 'arriba' ? i - 1 : i + 1
  if (i < 0 || j < 0 || j >= lista.length) return { ok: true, mensaje: '' }
  await supabase.from('procesos').update({ orden: lista[j].orden }).eq('id', lista[i].id)
  await supabase.from('procesos').update({ orden: lista[i].orden }).eq('id', lista[j].id)
  revalidatePath(g.ruta)
  return { ok: true, mensaje: '' }
}
