import { notFound } from 'next/navigation'
import { supabaseServer } from '@/lib/supabase/server'
import { getPerfil, areasVisibles } from '@/lib/perfil'
import Pasos, { type Paso } from './Pasos'

export default async function Procedimiento() {
  const perfil = await getPerfil()
  if (!areasVisibles(perfil).includes('sepelio')) notFound()

  const { data } = await supabaseServer().from('pasos_procedimiento')
    .select('id, orden, titulo, descripcion, tipo, si_texto, no_texto, enlaces')
    .eq('area', 'sepelio').order('orden')

  const esAdmin = perfil.rol === 'admin'
  return (
    <>
      <div className="barra">
        <div>
          <h1>Procedimiento administrativo de Sepelio</h1>
          <div className="suave">
            Paso a paso del servicio, desde la solicitud hasta el cierre.
            {esAdmin ? ' Como administrador podés editar los pasos y agregar enlaces.' : ''}
          </div>
        </div>
      </div>
      <Pasos pasos={(data ?? []) as Paso[]} esAdmin={esAdmin} />
    </>
  )
}
