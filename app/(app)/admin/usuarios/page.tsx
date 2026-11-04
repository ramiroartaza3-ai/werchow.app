import { redirect } from 'next/navigation'
import { supabaseServer } from '@/lib/supabase/server'
import { getPerfil } from '@/lib/perfil'
import { ROLES, nombreArea } from '@/lib/indicadores'
import FormUsuario from './FormUsuario'

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
        <table>
          <thead><tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Áreas</th><th>Estado</th></tr></thead>
          <tbody>
            {(data ?? []).map((u) => (
              <tr key={u.id}>
                <td>{u.nombre}</td><td>{u.email}</td>
                <td>{ROLES.find((r) => r.clave === u.rol)?.nombre ?? u.rol}</td>
                <td>{u.rol === 'admin' ? 'Todas' : (u.areas as string[]).map(nombreArea).join(', ') || '—'}</td>
                <td>{u.activo ? 'Activo' : 'Desactivado'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  )
}
