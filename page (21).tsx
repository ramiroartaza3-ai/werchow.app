import { notFound } from 'next/navigation'
import { supabaseServer } from '@/lib/supabase/server'
import { getPerfil } from '@/lib/perfil'
import { MODULOS, type Reg } from '@/lib/rrhh'
import Registros from '@/components/rrhh/Registros'

export default async function ModuloRrhh({ params }: { params: { modulo: string } }) {
  const m = MODULOS[params.modulo]
  if (!m) notFound()
  const perfil = await getPerfil()
  if (perfil.rol !== 'admin' && perfil.rol !== 'rrhh') notFound()

  const supabase = supabaseServer()
  const [{ data: registros }, { data: legajos }] = await Promise.all([
    supabase.from(m.tabla).select('*').order(m.orden.col, { ascending: m.orden.asc }),
    supabase.from('legajos').select('id, nombre').order('nombre'),
  ])

  return (
    <>
      <div className="barra"><div><h1>{m.titulo}</h1><div className="suave">{m.ayuda}</div></div></div>
      <Registros modulo={m.clave} registros={(registros ?? []) as Reg[]} legajos={(legajos ?? []) as { id: number; nombre: string }[]} />
    </>
  )
}
