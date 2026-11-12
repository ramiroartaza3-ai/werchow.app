'use client'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
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
  const [finaliza, setFinaliza] = useState(nodo?.finaliza ?? false)
  const [error, setError] = useState('')
  const [pendiente, start] = useTransition()

  function enviar(e: React.FormEvent) {
    e.preventDefault(); setError('')
    start(async () => {
      const r = await guardarNodo(grupo, {
        id: nodo?.id, padre_id: padre, titulo, descripcion, tipo, si_texto: si, no_texto: no,
        enlaces: aEnlaces(enlaces), finaliza,
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
      <div className="campo checks"><label><input type="checkbox" checked={finaliza} onChange={(e) => setFinaliza(e.target.checked)} />
        Este paso o subproceso da por finalizada la gestión (no hace falta volver a los pasos anteriores)</label></div>
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
  const pathname = usePathname()
  const params = useSearchParams()
  const pedido = Number(params.get('nodo')) || null
  const actual = pedido ? nodos.find((n) => n.id === pedido) ?? null : null

  const [editando, setEditando] = useState<{ id?: number; padre?: number | null } | null>(null)
  const [pendiente, start] = useTransition()

  const buscar = (id: number | null) => (id === null ? undefined : nodos.find((n) => n.id === id))
  const hijosDe = (padre: number | null) =>
    nodos.filter((n) => n.padre_id === padre).sort((a, b) => a.orden - b.orden)
  const numeroDe = (id: number): string => {
    const n = buscar(id)
    if (!n) return ''
    const i = hijosDe(n.padre_id).findIndex((x) => x.id === id) + 1
    return n.padre_id === null ? `${i}` : `${numeroDe(n.padre_id)}.${i}`
  }
  const profundidad = (n: Nodo): number => {
    const p = buscar(n.padre_id)
    return p ? 1 + profundidad(p) : 0
  }
  // Enlace a un flujo (o al listado principal si id es null), con ancla opcional al paso de origen
  const aNodo = (id: number | null, ancla?: number) =>
    `${pathname}${id ? `?nodo=${id}` : ''}${ancla ? `#paso-${ancla}` : ''}`

  const cerrar = () => setEditando(null)
  const mover = (id: number, dir: 'arriba' | 'abajo') => start(async () => { await moverNodo(grupo, id, dir) })
  const borrar = (n: Nodo) => {
    const tieneHijos = hijosDe(n.id).length > 0
    const aviso = `¿Eliminar "${n.titulo}"?${tieneHijos ? ' También se eliminarán sus subprocesos.' : ''}`
    if (window.confirm(aviso)) start(async () => {
      const r = await borrarNodo(grupo, n.id)
      if (r.ok && actual?.id === n.id) window.location.assign(aNodo(n.padre_id))
    })
  }

  const formNuevo = (padre: number | null): React.ReactNode =>
    editando && editando.id === undefined && editando.padre === padre
      ? <FormNodo grupo={grupo} padre={padre} permiteDecision={permiteDecision} onCerrar={cerrar}
          titulo={padre === null ? `Agregar ${palabra}` : 'Agregar subproceso'} />
      : null

  const tarjeta = (n: Nodo, num: string, lista: Nodo[], i: number, encabezado = false): React.ReactNode => {
    const hijos = hijosDe(n.id)
    return (
      <article id={`paso-${n.id}`} className={`paso ${n.tipo === 'decision' ? 'decision' : ''} ${profundidad(n) > 0 ? 'subpaso' : ''} ${encabezado ? 'encabezado-flujo' : ''}`}>
        <div className="num" aria-hidden="true">{num}</div>
        <div>
          <h2>{n.titulo}</h2>
          {n.finaliza && <p className="finaliza">✔ Con este paso finaliza la gestión</p>}
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
          {!encabezado && hijos.length > 0 && (
            <div className="subprocesos">
              <div className="suave">{hijos.length === 1 ? 'Subproceso' : `Subprocesos (${hijos.length})`}: elegí uno para abrir su flujo</div>
              <div className="opciones">
                {hijos.map((h, k) => (
                  <Link key={h.id} className="opcion" href={aNodo(h.id)}>{`${num}.${k + 1} ${h.titulo}`} →</Link>
                ))}
              </div>
            </div>
          )}
          {puedeEditar && (
            <div className="acciones">
              <button type="button" className="secundario" onClick={() => setEditando({ id: n.id })}>Editar</button>
              {!encabezado && profundidad(n) < MAX_NIVEL && <button type="button" className="secundario" onClick={() => setEditando({ padre: n.id })}>Agregar subproceso</button>}
              {!encabezado && <button type="button" className="secundario" disabled={i === 0 || pendiente} onClick={() => mover(n.id, 'arriba')} aria-label={`Subir ${n.titulo}`}>Subir</button>}
              {!encabezado && <button type="button" className="secundario" disabled={i === lista.length - 1 || pendiente} onClick={() => mover(n.id, 'abajo')} aria-label={`Bajar ${n.titulo}`}>Bajar</button>}
              <button type="button" className="peligro" onClick={() => borrar(n)}>Eliminar</button>
            </div>
          )}
        </div>
      </article>
    )
  }

  // Lista de pasos de un nivel; los subprocesos no se despliegan acá: se abren como flujo propio
  const nivel = (padre: number | null, prefijo: string): React.ReactNode => {
    const lista = hijosDe(padre)
    return lista.map((n, i) => {
      const num = `${prefijo}${i + 1}`
      return (
        <div key={n.id}>
          {editando?.id === n.id
            ? <FormNodo grupo={grupo} nodo={n} padre={n.padre_id} permiteDecision={permiteDecision} onCerrar={cerrar} titulo="Editar" />
            : tarjeta(n, num, lista, i)}
          {formNuevo(n.id)}
        </div>
      )
    })
  }

  const botonAgregar = (padre: number | null, texto: string) =>
    puedeEditar && (formNuevo(padre) ?? (
      <button type="button" onClick={() => setEditando({ padre })}>{texto}</button>
    ))

  // ----- Vista de un subproceso (flujo propio) -----
  if (actual) {
    const num = numeroDe(actual.id)
    const padre = buscar(actual.padre_id)
    const ancestros: Nodo[] = []
    for (let p = padre; p; p = buscar(p.padre_id)) ancestros.unshift(p)
    const hijos = hijosDe(actual.id)
    const cierraGestion = actual.finaliza || hijos.some((h) => h.finaliza)
    const volver = (
      <Link className="volver" href={aNodo(actual.padre_id, actual.id)}>
        ← Volver a {padre ? `${numeroDe(padre.id)}. ${padre.titulo}` : 'todos los pasos'}
      </Link>
    )
    return (
      <div aria-busy={pendiente}>
        <nav className="migas" aria-label="Dónde estás">
          <Link href={aNodo(null)}>Inicio</Link>
          {ancestros.map((a) => (
            <span key={a.id}>› <Link href={aNodo(a.id)}>{numeroDe(a.id)} {a.titulo}</Link></span>
          ))}
          <span>› <strong>{num} {actual.titulo}</strong></span>
        </nav>
        <div className="barra-volver">{volver}</div>

        {editando?.id === actual.id
          ? <FormNodo grupo={grupo} nodo={actual} padre={actual.padre_id} permiteDecision={permiteDecision} onCerrar={cerrar} titulo="Editar" />
          : tarjeta(actual, num, [], 0, true)}

        {hijos.length > 0
          ? <h3 className="subtitulo-flujo">Pasos de este subproceso</h3>
          : <p className="suave" style={{ marginTop: '1rem' }}>Este subproceso no tiene pasos internos.</p>}
        {nivel(actual.id, `${num}.`)}
        {profundidad(actual) < MAX_NIVEL && botonAgregar(actual.id, 'Agregar paso o subproceso')}

        {cierraGestion
          ? <div className="fin-gestion" role="status"><strong>Fin de la gestión.</strong> Este subproceso da por finalizada la gestión: no hace falta volver a los pasos anteriores.</div>
          : null}
        <div className="barra-volver">{volver}</div>
      </div>
    )
  }

  // ----- Vista principal -----
  return (
    <div aria-busy={pendiente}>
      {pedido && <p className="suave">No se encontró ese subproceso: se muestra el listado principal.</p>}
      {nodos.length === 0 && <p>Todavía no hay contenido cargado.</p>}
      {nivel(null, '')}
      {botonAgregar(null, `Agregar ${palabra}`)}
      {puedeEditar && nodos.some((n) => n.tipo === 'decision') && (
        <p className="suave" style={{ marginTop: '1rem' }}>
          Los textos de Sí y No pueden mencionar números de paso: si cambiás el orden, revisalos.
        </p>
      )}
    </div>
  )
}
