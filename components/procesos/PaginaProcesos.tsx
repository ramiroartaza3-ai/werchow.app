import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { supabaseServer } from '@/lib/supabase/server'
import { getPerfil, areasVisibles } from '@/lib/perfil'
import { GRUPOS, type GrupoClave, type Nodo } from '@/lib/procesos'
import Arbol from './Arbol'

export default async function PaginaProcesos({ grupo, titulo, ayuda, palabra, permiteDecision = false }: {
  grupo: GrupoClave; titulo: string; ayuda: string; palabra: string; permiteDecision?: boolean
}) {
  const perfil = await getPerfil()
  const g = GRUPOS[grupo]
  if (!areasVisibles(perfil).includes(g.area)) notFound()

  const { data } = await supabaseServer().from('procesos')
    .select('id, padre_id, orden, titulo, descripcion, tipo, si_texto, no_texto, enlaces, finaliza')
    .eq('grupo', grupo)

  const puedeEditar = perfil.rol === 'admin' || (g.area === 'administracion' && perfil.rol === 'rrhh')
  return (
    <>
      <div className="barra"><div>
        <h1>{titulo}</h1>
        <div className="suave">{ayuda}{puedeEditar ? ' Podés editar, ordenar y crear subprocesos; cada subproceso se abre como un flujo propio.' : ''}</div>
      </div></div>
      <Suspense fallback={null}>
        <Arbol grupo={grupo} nodos={(data ?? []) as Nodo[]} puedeEditar={puedeEditar} permiteDecision={permiteDecision} palabra={palabra} />
      </Suspense>
    </>
  )
}
