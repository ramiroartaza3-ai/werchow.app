'use server'
import { revalidatePath } from 'next/cache'
import { supabaseServer } from '@/lib/supabase/server'
import { MODULOS } from '@/lib/rrhh'
import { valida } from '@/lib/fechas'

type Resultado = { ok: boolean; mensaje: string }

export async function guardarRegistro(modulo: string, id: number | undefined, valores: Record<string, string>): Promise<Resultado> {
  const m = MODULOS[modulo]
  if (!m) return { ok: false, mensaje: 'Datos inválidos.' }

  const fila: Record<string, string | number | null> = {}
  for (const c of m.campos) {
    const v = (valores[c.clave] ?? '').trim()
    if (!v) {
      if (c.requerido) return { ok: false, mensaje: `Completá: ${c.etiqueta}.` }
      fila[c.clave] = null
      continue
    }
    if (c.tipo === 'numero') {
      const n = Number(v.replace(',', '.'))
      if (!Number.isFinite(n)) return { ok: false, mensaje: `Número inválido en: ${c.etiqueta}.` }
      fila[c.clave] = n
    } else if (c.tipo === 'legajo') {
      const n = Number(v)
      if (!Number.isInteger(n)) return { ok: false, mensaje: `Elegí una persona en: ${c.etiqueta}.` }
      fila[c.clave] = n
    } else if (c.tipo === 'fecha') {
      if (!valida(v)) return { ok: false, mensaje: `Fecha inválida en: ${c.etiqueta}.` }
      fila[c.clave] = v
    } else if (c.tipo === 'select') {
      if (!c.opciones?.some((o) => o.valor === v)) return { ok: false, mensaje: `Opción inválida en: ${c.etiqueta}.` }
      fila[c.clave] = v
    } else if (c.tipo === 'url') {
      if (!/^https?:\/\//i.test(v)) return { ok: false, mensaje: `El enlace debe empezar con https:// (${c.etiqueta}).` }
      fila[c.clave] = v
    } else {
      fila[c.clave] = v
    }
  }

  const supabase = supabaseServer()
  const { error } = id
    ? await supabase.from(m.tabla).update(fila).eq('id', id)
    : await supabase.from(m.tabla).insert(fila)
  if (error) return { ok: false, mensaje: 'No se pudo guardar. Revisá los datos y que tengas permiso de RR.HH.' }

  revalidatePath(`/rrhh/${m.clave}`)
  return { ok: true, mensaje: 'Guardado.' }
}

export async function borrarRegistro(modulo: string, id: number): Promise<Resultado> {
  const m = MODULOS[modulo]
  if (!m) return { ok: false, mensaje: 'Datos inválidos.' }
  const { error } = await supabaseServer().from(m.tabla).delete().eq('id', id)
  if (error) return { ok: false, mensaje: 'No se pudo eliminar.' }
  revalidatePath(`/rrhh/${m.clave}`)
  return { ok: true, mensaje: 'Eliminado.' }
}
