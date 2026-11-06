import Link from 'next/link'
import { getPerfil, areasVisibles } from '@/lib/perfil'
import { INDICADORES, nombreArea, ROLES } from '@/lib/indicadores'
import { cerrarSesion } from './actions'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const perfil = await getPerfil()
  const visibles = areasVisibles(perfil)
  const operativo = perfil.rol === 'usuario'
  const esRrhh = perfil.rol === 'admin' || perfil.rol === 'rrhh'
  const conObjetivos = operativo ? [] : visibles.filter((a) => INDICADORES[a])
  const rol = ROLES.find((r) => r.clave === perfil.rol)?.nombre ?? perfil.rol

  return (
    <div className="shell">
      <aside className="lateral">
        <div className="marca">Werchow</div>
        <nav aria-label="Principal">
          {operativo ? <Link href="/inicio">Inicio</Link> : <Link href="/panel">Panel de objetivos</Link>}
          {conObjetivos.length > 0 && <div className="grupo">Cargar objetivos</div>}
          {conObjetivos.map((a) => (
            <Link key={a} href={`/objetivos/${a}`}>{nombreArea(a)}</Link>
          ))}
          {visibles.includes('sepelio') && (<>
            <div className="grupo">Sepelio</div>
            <Link href="/sepelio/procedimiento">Procedimiento</Link>
            <Link href="/sepelio/calendario/turnos">Turnos</Link>
            <Link href="/sepelio/calendario/guardias">Guardias</Link>
          </>)}
          {visibles.includes('ventas') && (<>
            <div className="grupo">Ventas</div>
            <Link href="/ventas/guia">Guía de gestión</Link>
          </>)}
          {visibles.includes('salud') && (<>
            <div className="grupo">Salud</div>
            <Link href="/salud/calendario">Horarios</Link>
          </>)}
          {visibles.includes('administracion') && (<>
            <div className="grupo">Administración</div>
            <Link href="/rrhh/politicas">Políticas</Link>
            <Link href="/rrhh/plan-carrera">Plan de carrera</Link>
            <Link href="/rrhh/induccion">Planes de inducción</Link>
            {esRrhh && (<>
              <div className="grupo">Recursos humanos</div>
              <Link href="/rrhh/legajos">Legajos</Link>
              <Link href="/rrhh/busquedas">Búsquedas de personal</Link>
              <Link href="/rrhh/rendimiento">Gestión del rendimiento</Link>
              <Link href="/rrhh/memos">Memos y notificaciones</Link>
              <Link href="/rrhh/minutas">Minutas de reunión</Link>
            </>)}
          </>)}
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
