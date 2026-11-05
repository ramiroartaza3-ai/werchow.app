'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase/client'
import { AREAS, ROLES, nombreArea } from '@/lib/indicadores'

export type Usuario = { id: string; email: string; nombre: string | null; rol: string; areas: string[]; activo: boolean }

function Editor({ u, esYo, onCerrar }: { u: Usuario; esYo: boolean; onCerrar: () => void }) {
  const router = useRouter()
  const [nombre, setNombre] = useState(u.nombre ?? '')
  const [rol, setRol] = useState(u.rol)
  const [areas, setAreas] = useState<string[]>(u.areas)
  const [activo, setActivo] = useState(u.activo)
  const [clave, setClave] = useState('')
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null)
  const [cargando, setCargando] = useState(false)

  const alternar = (a: string) => setAreas((p) => p.includes(a) ? p.filter((x) => x !== a) : [...p, a])

  async function guardar(e: React.FormEvent) {
    e.preventDefault(); setCargando(true); setMsg(null)
    const todas = AREAS.map((a) => a.clave as string)
    const { error } = await supabaseBrowser().from('perfiles')
      .update({ nombre: nombre.trim() || null, rol, areas: rol === 'admin' ? todas : areas, activo }).eq('id', u.id)
    setCargando(false)
    if (error) return setMsg({ ok: false, texto: error.message })
    router.refresh(); onCerrar()
  }

  async function restablecer() {
    if (clave.length < 8) return setMsg({ ok: false, texto: 'La clave temporal debe tener 8 caracteres o más.' })
    setCargando(true); setMsg(null)
    const { error } = await supabaseBrowser().functions.invoke('restablecer-clave', { body: { usuario_id: u.id, clave } })
    setCargando(false)
    if (error) {
      let texto = 'No se pudo restablecer la clave.'
      try { texto = (await (error as any).context.json()).error ?? texto } catch {}
      return setMsg({ ok: false, texto })
    }
    setClave('')
    setMsg({ ok: true, texto: 'Clave restablecida. Pasale la clave temporal; la cambia al ingresar.' })
  }

  return (
    <form onSubmit={guardar} style={{ marginTop: '.75rem' }}>
      <div className="fila-campos">
        <div className="campo"><label htmlFor={`n${u.id}`}>Nombre y apellido</label>
          <input id={`n${u.id}`} value={nombre} onChange={(e) => setNombre(e.target.value)} /></div>
        <div className="campo"><label htmlFor={`r${u.id}`}>Rol</label>
          <select id={`r${u.id}`} value={rol} disabled={esYo} onChange={(e) => setRol(e.target.value)}>
            {ROLES.map((r) => <option key={r.clave} value={r.clave}>{r.nombre}</option>)}
          </select></div>
      </div>
      {rol !== 'admin' && (
        <div className="campo"><label>Áreas que puede ver</label>
          <div className="checks">
            {AREAS.map((a) => (
              <label key={a.clave}><input type="checkbox" checked={areas.includes(a.clave)} onChange={() => alternar(a.clave)} />{a.nombre}</label>
            ))}
          </div></div>
      )}
      <div className="campo checks"><label><input type="checkbox" checked={activo} disabled={esYo} onChange={(e) => setActivo(e.target.checked)} />
        Usuario activo (si lo desactivás, no puede usar el sistema)</label></div>
      <div className="acciones">
        <button type="submit" disabled={cargando}>{cargando ? 'Guardando…' : 'Guardar cambios'}</button>
        <button type="button" className="secundario" onClick={onCerrar}>Cancelar</button>
      </div>
      {!esYo && (
        <div className="campo" style={{ marginTop: '1rem' }}>
          <label htmlFor={`c${u.id}`}>Restablecer clave (clave temporal de 8 caracteres o más)</label>
          <div style={{ display: 'flex', gap: '.5rem' }}>
            <input id={`c${u.id}`} autoComplete="off" value={clave} onChange={(e) => setClave(e.target.value)} />
            <button type="button" className="secundario" disabled={cargando} onClick={restablecer} style={{ whiteSpace: 'nowrap' }}>Restablecer</button>
          </div>
        </div>
      )}
      {msg && <p role="status" className={msg.ok ? 'mensaje-ok' : 'mensaje-error'}>{msg.texto}</p>}
    </form>
  )
}

export default function ListaUsuarios({ usuarios, yo }: { usuarios: Usuario[]; yo: string }) {
  const [editando, setEditando] = useState<string | null>(null)
  return (
    <div>
      {usuarios.map((u) => (
        <div key={u.id} style={{ padding: '.75rem 0', borderBottom: '1px solid var(--linea)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div>
              <strong>{u.nombre ?? u.email}</strong>{!u.activo && <span className="etiqueta-cambio" style={{ background: '#f1d3cd', color: '#6b2318' }}>Desactivado</span>}
              <div className="suave">{u.email} · {ROLES.find((r) => r.clave === u.rol)?.nombre ?? u.rol} · {u.rol === 'admin' ? 'Todas las áreas' : u.areas.map(nombreArea).join(', ') || 'Sin áreas'}</div>
            </div>
            {editando !== u.id && <button type="button" className="secundario" onClick={() => setEditando(u.id)}>Editar</button>}
          </div>
          {editando === u.id && <Editor u={u} esYo={u.id === yo} onCerrar={() => setEditando(null)} />}
        </div>
      ))}
    </div>
  )
}
