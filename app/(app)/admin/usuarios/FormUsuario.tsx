'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase/client'
import { AREAS, ROLES } from '@/lib/indicadores'

export default function FormUsuario() {
  const router = useRouter()
  const [usuario, setUsuario] = useState('')
  const [nombre, setNombre] = useState('')
  const [rol, setRol] = useState('usuario')
  const [areas, setAreas] = useState<string[]>([])
  const [clave, setClave] = useState('')
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null)
  const [cargando, setCargando] = useState(false)

  async function crear(e: React.FormEvent) {
    e.preventDefault()
    setCargando(true); setMsg(null)
    const { data, error } = await supabaseBrowser().functions.invoke('crear-usuario', {
      body: { usuario, nombre, rol, areas, clave },
    })
    if (error) {
      let texto = 'No se pudo crear el usuario.'
      try { texto = (await (error as any).context.json()).error ?? texto } catch {}
      setMsg({ ok: false, texto })
    } else {
      setMsg({ ok: true, texto: `Usuario ${data.email} creado. Pasale la clave temporal; la cambia al primer ingreso.` })
      setUsuario(''); setNombre(''); setClave(''); setAreas([]); setRol('usuario')
      router.refresh()
    }
    setCargando(false)
  }

  const alternar = (a: string) => setAreas((p) => p.includes(a) ? p.filter((x) => x !== a) : [...p, a])

  return (
    <form onSubmit={crear}>
      <div className="fila-campos">
        <div className="campo"><label htmlFor="nombre">Nombre y apellido</label>
          <input id="nombre" required value={nombre} onChange={(e) => setNombre(e.target.value)} /></div>
        <div className="campo"><label htmlFor="usuario">Usuario (antes de @werchow.com)</label>
          <input id="usuario" required pattern="[A-Za-z0-9._-]{2,40}" placeholder="ej.: ventas.otero" value={usuario} onChange={(e) => setUsuario(e.target.value)} /></div>
      </div>
      <div className="fila-campos">
        <div className="campo"><label htmlFor="rol">Rol</label>
          <select id="rol" value={rol} onChange={(e) => setRol(e.target.value)}>
            {ROLES.map((r) => <option key={r.clave} value={r.clave}>{r.nombre}</option>)}
          </select></div>
        <div className="campo"><label htmlFor="clave">Clave temporal (8 caracteres o más)</label>
          <input id="clave" type="text" required minLength={8} autoComplete="off" value={clave} onChange={(e) => setClave(e.target.value)} /></div>
      </div>
      <div className="campo">
        <label>Áreas que puede ver</label>
        <div className="checks">
          {AREAS.map((a) => (
            <label key={a.clave}><input type="checkbox" checked={areas.includes(a.clave)} onChange={() => alternar(a.clave)} />{a.nombre}</label>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <button type="submit" disabled={cargando}>{cargando ? 'Creando…' : 'Crear usuario'}</button>
        {msg && <span role="status" className={msg.ok ? 'mensaje-ok' : 'mensaje-error'}>{msg.texto}</span>}
      </div>
    </form>
  )
}
