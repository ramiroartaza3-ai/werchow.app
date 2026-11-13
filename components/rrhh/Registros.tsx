'use client'
import { useState, useTransition } from 'react'
import { guardarRegistro, borrarRegistro } from './actions'
import { MODULOS, type Campo, type Reg } from '@/lib/rrhh'
import { hoy, parse } from '@/lib/fechas'

type Legajo = { id: number; nombre: string }

const texto = (v: unknown) => (v === null || v === undefined ? '' : String(v))
const fechaLarga = (s: string) => parse(s).toLocaleDateString('es-AR', { timeZone: 'UTC' })

function FormRegistro({ modulo, reg, legajos, onCerrar }: { modulo: string; reg?: Reg; legajos: Legajo[]; onCerrar: () => void }) {
  const m = MODULOS[modulo]
  const [v, setV] = useState<Record<string, string>>(() => {
    const ini: Record<string, string> = {}
    for (const c of m.campos) ini[c.clave] = reg ? texto(reg[c.clave]) : c.defecto === 'hoy' ? hoy() : c.defecto ?? ''
    return ini
  })
  const [error, setError] = useState('')
  const [pendiente, start] = useTransition()
  const set = (k: string, val: string) => setV((p) => ({ ...p, [k]: val }))

  function enviar(e: React.FormEvent) {
    e.preventDefault(); setError('')
    start(async () => {
      const r = await guardarRegistro(modulo, reg ? Number(reg.id) : undefined, v)
      if (r.ok) onCerrar(); else setError(r.mensaje)
    })
  }

  const entrada = (c: Campo) => {
    const id = `campo-${c.clave}`
    if (c.tipo === 'textarea') return <textarea id={id} value={v[c.clave]} onChange={(e) => set(c.clave, e.target.value)} />
    if (c.tipo === 'select') return (
      <select id={id} required={c.requerido} value={v[c.clave]} onChange={(e) => set(c.clave, e.target.value)}>
        {!c.requerido && <option value="">—</option>}
        {c.opciones?.map((o) => <option key={o.valor} value={o.valor}>{o.texto}</option>)}
      </select>
    )
    if (c.tipo === 'legajo') return (
      <select id={id} required={c.requerido} value={v[c.clave]} onChange={(e) => set(c.clave, e.target.value)}>
        <option value="">{c.requerido ? 'Elegí una persona' : 'General (ninguna en particular)'}</option>
        {legajos.map((l) => <option key={l.id} value={l.id}>{l.nombre}</option>)}
      </select>
    )
    const tipo = c.tipo === 'fecha' ? 'date' : c.tipo === 'numero' ? 'number' : 'text'
    return <input id={id} type={tipo} step={c.tipo === 'numero' ? 'any' : undefined} required={c.requerido}
      value={v[c.clave]} onChange={(e) => set(c.clave, e.target.value)} />
  }

  return (
    <form onSubmit={enviar} className="registro">
      <h2>{reg ? 'Editar' : m.nuevo}</h2>
      <div className="fila-campos">
        {m.campos.filter((c) => c.tipo !== 'textarea').map((c) => (
          <div className="campo" key={c.clave}><label htmlFor={`campo-${c.clave}`}>{c.etiqueta}</label>{entrada(c)}</div>
        ))}
      </div>
      {m.campos.filter((c) => c.tipo === 'textarea').map((c) => (
        <div className="campo" key={c.clave}><label htmlFor={`campo-${c.clave}`}>{c.etiqueta}</label>{entrada(c)}</div>
      ))}
      {error && <p className="mensaje-error" role="alert">{error}</p>}
      <div className="acciones">
        <button type="submit" disabled={pendiente}>{pendiente ? 'Guardando…' : 'Guardar'}</button>
        <button type="button" className="secundario" onClick={onCerrar}>Cancelar</button>
      </div>
    </form>
  )
}

export default function Registros({ modulo, registros, legajos }: { modulo: string; registros: Reg[]; legajos: Legajo[] }) {
  const m = MODULOS[modulo]
  const [editando, setEditando] = useState<number | 'nuevo' | null>(null)
  const [q, setQ] = useState('')
  const [pendiente, start] = useTransition()

  const nombreLegajo = (id: unknown) => legajos.find((l) => l.id === Number(id))?.nombre ?? ''
  const visibles = registros.filter((r) =>
    !q.trim() || Object.values(r).join(' ').toLowerCase().includes(q.trim().toLowerCase()) ||
    nombreLegajo(r.legajo_id).toLowerCase().includes(q.trim().toLowerCase()))

  const borrar = (r: Reg) => {
    if (window.confirm(`¿Eliminar "${m.principal(r, nombreLegajo(r.legajo_id))}"?`)) start(async () => { await borrarRegistro(modulo, Number(r.id)) })
  }

  const mostrar = (c: Campo, r: Reg) => {
    const val = texto(r[c.clave])
    if (!val) return ''
    if (c.tipo === 'select') return c.opciones?.find((o) => o.valor === val)?.texto ?? val
    if (c.tipo === 'fecha') return fechaLarga(val)
    if (c.tipo === 'legajo') return nombreLegajo(val)
    return val
  }

  return (
    <div aria-busy={pendiente}>
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'end', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <div className="campo buscador" style={{ margin: 0, flex: '1 1 16rem' }}>
          <label htmlFor="buscar">Buscar</label>
          <input id="buscar" type="search" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {editando !== 'nuevo' && <button type="button" onClick={() => setEditando('nuevo')}>{m.nuevo}</button>}
      </div>

      {editando === 'nuevo' && <FormRegistro modulo={modulo} legajos={legajos} onCerrar={() => setEditando(null)} />}
      {visibles.length === 0 && editando !== 'nuevo' && <p className="vacio">{registros.length ? 'Sin resultados.' : 'Todavía no hay registros.'}</p>}

      {visibles.map((r) => editando === Number(r.id) ? (
        <FormRegistro key={String(r.id)} modulo={modulo} reg={r} legajos={legajos} onCerrar={() => setEditando(null)} />
      ) : (
        <article key={String(r.id)} className="registro">
          <h2>{m.principal(r, nombreLegajo(r.legajo_id))}</h2>
          <div className="meta">
            {m.campos.filter((c) => !m.ocultar.includes(c.clave) && ['select', 'fecha', 'numero', 'legajo'].includes(c.tipo))
              .map((c) => mostrar(c, r) && `${c.etiqueta}: ${mostrar(c, r)}`).filter(Boolean).join(' · ')}
          </div>
          {m.campos.filter((c) => !m.ocultar.includes(c.clave) && ['texto', 'textarea', 'url'].includes(c.tipo)).map((c) => {
            const val = mostrar(c, r)
            if (!val) return null
            return (
              <div className="dato-linea" key={c.clave}><b>{c.etiqueta}:</b>{' '}
                {c.tipo === 'url' ? <a href={val} target="_blank" rel="noopener noreferrer">Abrir</a> : val}</div>
            )
          })}
          <div className="acciones">
            <button type="button" className="secundario" onClick={() => setEditando(Number(r.id))}>Editar</button>
            <button type="button" className="peligro" onClick={() => borrar(r)}>Eliminar</button>
          </div>
        </article>
      ))}
    </div>
  )
}
