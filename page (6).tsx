import '../../sepelio/sepelio.css'
import { redirect } from 'next/navigation'
import { supabaseServer } from '@/lib/supabase/server'
import { getPerfil } from '@/lib/perfil'
import FormUsuario from './FormUsuario'
import ListaUsuarios, { type Usuario } from './ListaUsuarios'

export default async function Usuarios() {
  const perfil = await getPerfil()
  if (perfil.rol !== 'admin') redirect('/panel')

  const { data } = await supabaseServer().from('perfiles')
    .select('id, email, nombre, rol, areas, activo').order('creado_en')

  return (
    <>
      <div className="barra"><div><h1>Usuarios</h1>
        <div className="suave">Los correos nuevos terminan siempre en @werchow.com.</div></div></div>

      <section className="area" style={{ marginBottom: '1.5rem' }}>
        <h2>Crear usuario</h2>
        <FormUsuario />
      </section>

      <section className="area">
        <h2>Usuarios del sistema</h2>
        <ListaUsuarios usuarios={(data ?? []) as Usuario[]} yo={perfil.id} />
      </section>
    </>
  )
}
