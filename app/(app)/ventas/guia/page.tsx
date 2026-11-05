import { notFound } from 'next/navigation'
import { supabaseServer } from '@/lib/supabase/server'
import { getPerfil, areasVisibles } from '@/lib/perfil'
import Guia, { type Seccion } from './Guia'

export default async function GuiaVentas() {
  const perfil = await getPerfil()
  if (!areasVisibles(perfil).includes('ventas')) notFound()

  const { data } = await supabaseServer().from('guias_secciones')
    .select('id, orden, titulo, contenido, enlaces').eq('area', 'ventas').order('orden')

  const esAdmin = perfil.rol === 'admin'
  return (
    <>
      <div className="barra"><div>
        <h1>Guía de gestión de Ventas</h1>
        <div className="suave">Tipos de venta, materiales del vendedor y esquema de trabajo por modalidad.
          {esAdmin ? ' Como administrador podés editar las secciones y agregar enlaces.' : ''}</div>
      </div></div>
      <Guia secciones={(data ?? []) as Seccion[]} esAdmin={esAdmin} />
    </>
  )
}
