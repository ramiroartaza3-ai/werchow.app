'use client'
import { useState, useTransition } from 'react'
import { guardarSeccion, borrarSeccion, moverSeccion } from './actions'

export type Enlace = { texto: string; url: string }
export type Seccion = { id: number; orden: number; titulo: string; contenido: string; enlaces: Enlace[] }

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

function FormSeccion({ seccion, onCerrar }: { seccion?: Seccion; onCerrar: () => void }) {
  const [titulo, setTitulo] = useState(seccion?.titulo ?? '')
  const [contenido, setContenido] = useState(seccion?.contenido ?? '')
  const [enlaces, setEnlaces] = useState(aTexto(seccion?.enlaces ?? []))
  const [error, setError] = useState('')
  const [pendiente, start] = useTransition()

  function enviar(e: React.FormEvent) {
    e.preventDefault(); setError('')
    start(async () => {
      const r = await guardarSeccion({ id: seccion?.id, titulo, contenido, enlaces: aEnlaces(enlaces) })
      if (r.ok) onCerrar(); else setError(r.mensaje)
    })
  }

  return (
    <form onSubmit={enviar} className="paso" style={{ gridTemplateColumns: '1fr' }}>
      <div className="campo"><label htmlFor="t">Título</label>
        <input id="t" required value={titulo} onChange={(e) => setTitulo(e.target.value)} /></div>
      <div className="campo"><label htmlFor="c">Contenido (empezá una línea con “- ” para armar una lista)</label>
        <textarea id="c" style={{ minHeight: '10rem' }} value={contenido} onChange={(e) => setContenido(e.target.value)} /></div>
      <div className="campo"><label htmlFor="en">Enlaces (uno por línea, con el formato: Texto | https://dirección)</label>
        <textarea id="en" value={enlaces} onChange={(e) => setEnlaces(e.target.value)} placeholder="Carpeta HOME | https://..." /></div>
      {error && <p className="mensaje-error" role="alert">{error}</p>}
      <div className="acciones">
        <button type="submit" disabled={pendiente}>{pendiente ? 'Guardando…' : 'Guardar sección'}</button>
        <button type="button" className="secundario" onClick={onCerrar}>Cancelar</button>
      </div>
    </form>
  )
}

export default function Guia({ secciones, esAdmin }: { secciones: Seccion[]; esAdmin: boolean }) {
  const [editando, setEditando] = useState<number | 'nuevo' | null>(null)
  const [pendiente, start] = useTransition()
  const mover = (id: number, dir: 'arriba' | 'abajo') => start(async () => { await moverSeccion(id, dir) })
  const borrar = (s: Seccion) => {
    if (window.confirm(`¿Eliminar la sección "${s.titulo}"?`)) start(async () => { await borrarSeccion(s.id) })
  }

  return (
    <div aria-busy={pendiente}>
      {secciones.length === 0 && <p>Todavía no hay secciones cargadas.</p>}
      {secciones.map((s, i) =>
        editando === s.id ? <FormSeccion key={s.id} seccion={s} onCerrar={() => setEditando(null)} /> : (
          <article key={s.id} className="paso">
            <div className="num" aria-hidden="true">{i + 1}</div>
            <div>
              <h2>{s.titulo}</h2>
              <Contenido texto={s.contenido} />
              {s.enlaces?.length > 0 && (
                <div className="enlaces">
                  {s.enlaces.map((e, k) => (
                    <a key={k} href={e.url} {...(e.url.startsWith('/') ? {} : { target: '_blank', rel: 'noopener noreferrer' })}>{e.texto}</a>
                  ))}
                </div>
              )}
              {esAdmin && (
                <div className="acciones">
                  <button type="button" className="secundario" onClick={() => setEditando(s.id)}>Editar</button>
                  <button type="button" className="secundario" disabled={i === 0 || pendiente} onClick={() => mover(s.id, 'arriba')} aria-label="Subir sección">Subir</button>
                  <button type="button" className="secundario" disabled={i === secciones.length - 1 || pendiente} onClick={() => mover(s.id, 'abajo')} aria-label="Bajar sección">Bajar</button>
                  <button type="button" className="peligro" onClick={() => borrar(s)}>Eliminar</button>
                </div>
              )}
            </div>
          </article>
        )
      )}
      {esAdmin && (editando === 'nuevo'
        ? <FormSeccion onCerrar={() => setEditando(null)} />
        : <button type="button" onClick={() => setEditando('nuevo')}>Agregar sección</button>)}
    </div>
  )
}
