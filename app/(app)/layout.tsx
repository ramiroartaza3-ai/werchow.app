import Link from 'next/link'
import { getPerfil, areasVisibles } from '@/lib/perfil'
import { INDICADORES, nombreArea, ROLES } from '@/lib/indicadores'
import { cerrarSesion } from './actions'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const perfil = await getPerfil()
  const conObjetivos = areasVisibles(perfil).filter((a) => INDICADORES[a])
  const rol = ROLES.find((r) => r.clave === perfil.rol)?.nombre ?? perfil.rol

  return (
    <div className="shell">
      <aside className="lateral">
        <div className="marca">Werchow</div>
        <nav aria-label="Principal">
          <Link href="/panel">Panel de objetivos</Link>
          {conObjetivos.length > 0 && <div className="grupo">Cargar objetivos</div>}
          {conObjetivos.map((a) => (
            <Link key={a} href={`/objetivos/${a}`}>{nombreArea(a)}</Link>
          ))}
          {perfil.rol === 'admin' && (<>
            <div className="grupo">Administración del sistema</div>
            <Link href="/admin/usuarios">Usuarios</Link>
          </>)}
        </nav>
        <div className="pie">
          <div>{perfil.nombre ?? perfil.email}</div>
          <div>{rol}</div>
          <form action={cerrarSesion}><button className="secundario" type="submit">Cerrar sesión</button></form>
        </div>
      </aside>
      <main className="contenido">{children}</main>
    </div>
  )
}
