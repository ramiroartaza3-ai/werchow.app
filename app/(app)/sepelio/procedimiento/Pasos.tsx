'use client'
import { useState, useTransition } from 'react'
import { guardarPaso, borrarPaso, moverPaso } from './actions'

export type Enlace = { texto: string; url: string }
export type Paso = {
  id: number; orden: number; titulo: string; descripcion: string
  tipo: 'paso' | 'decision'; si_texto: string | null; no_texto: string | null; enlaces: Enlace[]
}

const aTexto = (e: Enlace[]) => e.map((x) => `${x.texto} | ${x.url}`).join('\n')
const aEnlaces = (t: string): Enlace[] =>
  t.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
    const i = l.lastIndexOf('|')
    return i < 0 ? { texto: l, url: l } : { texto: l.slice(0, i).trim(), url: l.slice(i + 1).trim() }
  })

function FormPaso({ paso, onCerrar }: { paso?: Paso; onCerrar: () => void }) {
  const [titulo, setTitulo] = useState(paso?.titulo ?? '')
  const [descripcion, setDescripcion] = useState(paso?.descripcion ?? '')
  const [tipo, setTipo] = useState<'paso' | 'decision'>(paso?.tipo ?? 'paso')
  const [si, setSi] = useState(paso?.si_texto ?? '')
  const [no, setNo] = useState(paso?.no_texto ?? '')
  const [enlaces, setEnlaces] = useState(aTexto(paso?.enlaces ?? []))
  const [error, setError] = useState('')
  const [pendiente, start] = useTransition()

  function enviar(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    start(async () => {
      const r = await guardarPaso({
        id: paso?.id, titulo, descripcion, tipo, si_texto: si, no_texto: no, enlaces: aEnlaces(enlaces),
      })
      if (r.ok) onCerrar(); else setError(r.mensaje)
    })
  }

  return (
    <form onSubmit={enviar} className="paso" style={{ gridTemplateColumns: '1fr' }}>
      <div className="campo"><label htmlFor="t">Título</label>
        <input id="t" required value={titulo} onChange={(e) => setTitulo(e.target.value)} /></div>
      <div className="campo"><label htmlFor="tp">Tipo de paso</label>
        <select id="tp" value={tipo} onChange={(e) => setTipo(e.target.value as 'paso' | 'decision')}>
          <option value="paso">Paso con una acción</option>
          <option value="decision">Decisión con dos caminos (Sí / No)</option>
        </select></div>
      <div className="campo"><label htmlFor="d">Descripción</label>
        <textarea id="d" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} /></div>
      {tipo === 'decision' && (
        <div className="fila-campos">
          <div className="campo"><label htmlFor="si">Si la respuesta es Sí</label>
            <input id="si" value={si} onChange={(e) => setSi(e.target.value)} /></div>
          <div className="campo"><label htmlFor="no">Si la respuesta es No</label>
            <input id="no" value={no} onChange={(e) => setNo(e.target.value)} /></div>
        </div>
      )}
      <div className="campo"><label htmlFor="en">Enlaces (uno por línea, con el formato: Texto | https://dirección)</label>
        <textarea id="en" value={enlaces} onChange={(e) => setEnlaces(e.target.value)}
          placeholder="Sistema SGI | https://..." /></div>
      {error && <p className="mensaje-error" role="alert">{error}</p>}
      <div className="acciones">
        <button type="submit" disabled={pendiente}>{pendiente ? 'Guardando…' : 'Guardar paso'}</button>
        <button type="button" className="secundario" onClick={onCerrar}>Cancelar</button>
      </div>
    </form>
  )
}

export default function Pasos({ pasos, esAdmin }: { pasos: Paso[]; esAdmin: boolean }) {
  const [editando, setEditando] = useState<number | 'nuevo' | null>(null)
  const [pendiente, start] = useTransition()

  const mover = (id: number, dir: 'arriba' | 'abajo') => start(async () => { await moverPaso(id, dir) })
  const borrar = (p: Paso) => {
    if (window.confirm(`¿Eliminar el paso "${p.titulo}"?`)) start(async () => { await borrarPaso(p.id) })
  }

  return (
    <div aria-busy={pendiente}>
      {pasos.length === 0 && <p>Todavía no hay pasos cargados.</p>}
      {pasos.map((p, i) =>
        editando === p.id ? (
          <FormPaso key={p.id} paso={p} onCerrar={() => setEditando(null)} />
        ) : (
          <article key={p.id} className={`paso ${p.tipo === 'decision' ? 'decision' : ''}`}>
            <div className="num" aria-hidden="true">{i + 1}</div>
            <div>
              <h2>{p.titulo}</h2>
              {p.descripcion && <p className="desc">{p.descripcion}</p>}
              {p.tipo === 'decision' && (
                <div className="salidas">
                  <div className="salida"><b>Sí:</b>{p.si_texto || '—'}</div>
                  <div className="salida"><b>No:</b>{p.no_texto || '—'}</div>
                </div>
              )}
              {p.enlaces?.length > 0 && (
                <div className="enlaces">
                  {p.enlaces.map((e, k) => (
                    <a key={k} href={e.url} {...(e.url.startsWith('/') ? {} : { target: '_blank', rel: 'noopener noreferrer' })}>{e.texto}</a>
                  ))}
                </div>
              )}
              {esAdmin && (
                <div className="acciones">
                  <button type="button" className="secundario" onClick={() => setEditando(p.id)}>Editar</button>
                  <button type="button" className="secundario" disabled={i === 0 || pendiente} onClick={() => mover(p.id, 'arriba')} aria-label="Subir paso">Subir</button>
                  <button type="button" className="secundario" disabled={i === pasos.length - 1 || pendiente} onClick={() => mover(p.id, 'abajo')} aria-label="Bajar paso">Bajar</button>
                  <button type="button" className="peligro" onClick={() => borrar(p)}>Eliminar</button>
                </div>
              )}
            </div>
          </article>
        )
      )}
      {esAdmin && (editando === 'nuevo'
        ? <FormPaso onCerrar={() => setEditando(null)} />
        : <button type="button" onClick={() => setEditando('nuevo')}>Agregar paso</button>)}
      {esAdmin && pasos.some((p) => p.tipo === 'decision') && (
        <p className="suave" style={{ marginTop: '1rem' }}>
          Los textos de Sí y No mencionan números de paso: si cambiás el orden, revisalos.
        </p>
      )}
    </div>
  )
}
