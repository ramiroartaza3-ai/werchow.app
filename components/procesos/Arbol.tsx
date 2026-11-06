'use client'
import { useState, useTransition } from 'react'
import { guardarNodo, borrarNodo, moverNodo } from './actions'
import { MAX_NIVEL, type Enlace, type GrupoClave, type Nodo } from '@/lib/procesos'

const aTexto = (e: Enlace[]) => e.map((x) => `${x.texto} | ${x.url}`).join('\n')
const aEnlaces = (t: string): Enlace[] =>
  t.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
    const i = l.lastIndexOf('|')
    return i < 0 ? { texto: l, url: l } : { texto: l.slice(0, i).trim(), url: l.slice(i + 1).trim() }
  })

// Las líneas que empiezan con "- " se muestran como viñetas; el resto, como párrafos.
function Contenido({ texto }: { texto: string }) {
  const bloques: { lista: boolean; items: string[] }[] = []
  for (const linea of texto.split('\n').map((l) => l.trim()).filter(Boolean)) {
    const esItem = linea.startsWith('- ')
    const limpio = esItem ? linea.slice(2) : linea
    const ult = bloques[bloques.length - 1]
    if (ult && ult.lista === esItem) ult.items.push(limpio)
    else bloques.push({ lista: esItem, items: [limpio] })
  }
  return (
    <>
      {bloques.map((b, i) => b.lista
        ? <ul key={i} style={{ margin: '0 0 .5rem', paddingLeft: '1.25rem', maxWidth: '75ch' }}>{b.items.map((t, k) => <li key={k}>{t}</li>)}</ul>
        : b.items.map((t, k) => <p key={`${i}-${k}`} className="desc">{t}</p>))}
    </>
  )
}

function FormNodo({ grupo, nodo, padre, permiteDecision, titulo: tituloForm, onCerrar }: {
  grupo: GrupoClave; nodo?: Nodo; padre: number | null; permiteDecision: boolean; titulo: string; onCerrar: () => void
}) {
  const [titulo, setTitulo] = useState(nodo?.titulo ?? '')
  const [descripcion, setDescripcion] = useState(nodo?.descripcion ?? '')
  const [tipo, setTipo] = useState<'paso' | 'decision'>(nodo?.tipo ?? 'paso')
  const [si, setSi] = useState(nodo?.si_texto ?? '')
  const [no, setNo] = useState(nodo?.no_texto ?? '')
  const [enlaces, setEnlaces] = useState(aTexto(nodo?.enlaces ?? []))
  const [error, setError] = useState('')
  const [pendiente, start] = useTransition()

  function enviar(e: React.FormEvent) {
    e.preventDefault(); setError('')
    start(async () => {
      const r = await guardarNodo(grupo, {
        id: nodo?.id, padre_id: padre, titulo, descripcion, tipo, si_texto: si, no_texto: no, enlaces: aEnlaces(enlaces),
      })
      if (r.ok) onCerrar(); else setError(r.mensaje)
    })
  }

  return (
    <form onSubmit={enviar} className="paso" style={{ gridTemplateColumns: '1fr' }}>
      <h2>{tituloForm}</h2>
      <div className="campo"><label htmlFor="t">Título</label>
        <input id="t" required value={titulo} onChange={(e) => setTitulo(e.target.value)} /></div>
      {permiteDecision && (
        <div className="campo"><label htmlFor="tp">Tipo</label>
          <select id="tp" value={tipo} onChange={(e) => setTipo(e.target.value as 'paso' | 'decision')}>
            <option value="paso">Paso con una acción</option>
            <option value="decision">Decisión con dos caminos (Sí / No)</option>
          </select></div>
      )}
      <div className="campo"><label htmlFor="d">Descripción (empezá una línea con “- ” para armar una lista)</label>
        <textarea id="d" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} /></div>
      {permiteDecision && tipo === 'decision' && (
        <div className="fila-campos">
          <div className="campo"><label htmlFor="si">Si la respuesta es Sí</label>
            <input id="si" value={si} onChange={(e) => setSi(e.target.value)} /></div>
          <div className="campo"><label htmlFor="no">Si la respuesta es No</label>
            <input id="no" value={no} onChange={(e) => setNo(e.target.value)} /></div>
        </div>
      )}
      <div className="campo"><label htmlFor="en">Enlaces (uno por línea, con el formato: Texto | https://dirección)</label>
        <textarea id="en" value={enlaces} onChange={(e) => setEnlaces(e.target.value)} placeholder="Sistema SGI | https://..." /></div>
      {error && <p className="mensaje-error" role="alert">{error}</p>}
      <div className="acciones">
        <button type="submit" disabled={pendiente}>{pendiente ? 'Guardando…' : 'Guardar'}</button>
        <button type="button" className="secundario" onClick={onCerrar}>Cancelar</button>
      </div>
    </form>
  )
}

export default function Arbol({ grupo, nodos, puedeEditar, permiteDecision, palabra }: {
  grupo: GrupoClave; nodos: Nodo[]; puedeEditar: boolean; permiteDecision: boolean; palabra: string
}) {
  const [editando, setEditando] = useState<{ id?: number; padre?: number | null } | null>(null)
  const [pendiente, start] = useTransition()

  const hijosDe = (padre: number | null) =>
    nodos.filter((n) => n.padre_id === padre).sort((a, b) => a.orden - b.orden)
  const cerrar = () => setEditando(null)

  const mover = (id: number, dir: 'arriba' | 'abajo') => start(async () => { await moverNodo(grupo, id, dir) })
  const borrar = (n: Nodo) => {
    const tieneHijos = hijosDe(n.id).length > 0
    const aviso = `¿Eliminar "${n.titulo}"?${tieneHijos ? ' También se eliminarán sus subprocesos.' : ''}`
    if (window.confirm(aviso)) start(async () => { await borrarNodo(grupo, n.id) })
  }

  const formNuevo = (padre: number | null): React.ReactNode =>
    editando && editando.id === undefined && editando.padre === padre
      ? <FormNodo grupo={grupo} padre={padre} permiteDecision={permiteDecision} onCerrar={cerrar}
          titulo={padre === null ? `Agregar ${palabra}` : 'Agregar subproceso'} />
      : null

  const rama = (padre: number | null, prefijo: string, nivel: number): React.ReactNode => {
    const lista = hijosDe(padre)
    return lista.map((n, i) => {
      const num = `${prefijo}${i + 1}`
      return (
        <div key={n.id}>
          {editando?.id === n.id ? (
            <FormNodo grupo={grupo} nodo={n} padre={n.padre_id} permiteDecision={permiteDecision} onCerrar={cerrar} titulo="Editar" />
          ) : (
            <article className={`paso ${n.tipo === 'decision' ? 'decision' : ''} ${nivel > 0 ? 'subpaso' : ''}`}>
              <div className="num" aria-hidden="true">{num}</div>
              <div>
                <h2>{n.titulo}</h2>
                {n.descripcion && <Contenido texto={n.descripcion} />}
                {n.tipo === 'decision' && (
                  <div className="salidas">
                    <div className="salida"><b>Sí:</b>{n.si_texto || '—'}</div>
                    <div className="salida"><b>No:</b>{n.no_texto || '—'}</div>
                  </div>
                )}
                {n.enlaces?.length > 0 && (
                  <div className="enlaces">
                    {n.enlaces.map((e, k) => (
                      <a key={k} href={e.url} {...(e.url.startsWith('/') ? {} : { target: '_blank', rel: 'noopener noreferrer' })}>{e.texto}</a>
                    ))}
                  </div>
                )}
                {puedeEditar && (
                  <div className="acciones">
                    <button type="button" className="secundario" onClick={() => setEditando({ id: n.id })}>Editar</button>
                    {nivel < MAX_NIVEL && <button type="button" className="secundario" onClick={() => setEditando({ padre: n.id })}>Agregar subproceso</button>}
                    <button type="button" className="secundario" disabled={i === 0 || pendiente} onClick={() => mover(n.id, 'arriba')} aria-label={`Subir ${n.titulo}`}>Subir</button>
                    <button type="button" className="secundario" disabled={i === lista.length - 1 || pendiente} onClick={() => mover(n.id, 'abajo')} aria-label={`Bajar ${n.titulo}`}>Bajar</button>
                    <button type="button" className="peligro" onClick={() => borrar(n)}>Eliminar</button>
                  </div>
                )}
              </div>
            </article>
          )}
          <div className="hijos">
            {rama(n.id, `${num}.`, nivel + 1)}
            {formNuevo(n.id)}
          </div>
        </div>
      )
    })
  }

  return (
    <div aria-busy={pendiente}>
      {nodos.length === 0 && <p>Todavía no hay contenido cargado.</p>}
      {rama(null, '', 0)}
      {puedeEditar && (formNuevo(null) ?? (
        <button type="button" onClick={() => setEditando({ padre: null })}>Agregar {palabra}</button>
      ))}
      {puedeEditar && nodos.some((n) => n.tipo === 'decision') && (
        <p className="suave" style={{ marginTop: '1rem' }}>
          Los textos de Sí y No pueden mencionar números de paso: si cambiás el orden, revisalos.
        </p>
      )}
    </div>
  )
}
