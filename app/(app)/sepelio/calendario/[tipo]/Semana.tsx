'use client'
import { useRef, useState, useTransition } from 'react'
import { guardarAsignacion, borrarAsignacion, copiarSemana, marcarCumplido } from './actions'

export type Asig = {
  id: number; fecha: string; persona: string; hora_desde: string; hora_hasta: string
  es_cambio: boolean; cumplido: boolean; observaciones: string | null
}
type Dia = { fecha: string; etiqueta: string }
type Form = { id?: number; fecha: string; persona: string; desde: string; hasta: string; es_cambio: boolean; observaciones: string }

export default function Semana({ area, tipoDb, lunes, dias, hoy, asignaciones, editable, personas }: {
  area: 'sepelio' | 'salud' | 'ventas'; tipoDb: 'turno' | 'guardia' | 'horario'; lunes: string; dias: Dia[]; hoy: string
  asignaciones: Asig[]; editable: boolean; personas: string[]
}) {
  const vacio: Form = { fecha: dias[0].fecha, persona: '', desde: '08:00', hasta: '16:00', es_cambio: false, observaciones: '' }
  const [f, setF] = useState<Form>(vacio)
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null)
  const [pendiente, start] = useTransition()
  const panel = useRef<HTMLDivElement>(null)

  const irAlFormulario = () => panel.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  const agregarEn = (fecha: string) => { setF({ ...vacio, fecha, desde: f.desde, hasta: f.hasta }); setMsg(null); irAlFormulario() }
  const editar = (a: Asig) => {
    setF({ id: a.id, fecha: a.fecha, persona: a.persona, desde: a.hora_desde.slice(0, 5), hasta: a.hora_hasta.slice(0, 5), es_cambio: a.es_cambio, observaciones: a.observaciones ?? '' })
    setMsg(null); irAlFormulario()
  }

  function enviar(e: React.FormEvent) {
    e.preventDefault(); setMsg(null)
    start(async () => {
      const r = await guardarAsignacion({
        id: f.id, area, tipo: tipoDb, fecha: f.fecha, persona: f.persona,
        hora_desde: f.desde, hora_hasta: f.hasta, es_cambio: f.es_cambio, observaciones: f.observaciones,
      })
      setMsg({ ok: r.ok, texto: r.mensaje })
      if (r.ok) setF({ ...vacio, fecha: f.fecha, desde: f.desde, hasta: f.hasta })
    })
  }

  const quitar = (a: Asig) => {
    if (!window.confirm(`¿Quitar a ${a.persona} de este día?`)) return
    start(async () => { const r = await borrarAsignacion(a.id, area, tipoDb); setMsg({ ok: r.ok, texto: r.mensaje }) })
  }
  const marcar = (a: Asig, valor: boolean) => start(async () => {
    const r = await marcarCumplido(a.id, area, tipoDb, valor)
    if (!r.ok) setMsg({ ok: false, texto: r.mensaje })
  })
  const copiar = () => start(async () => { const r = await copiarSemana(area, tipoDb, lunes); setMsg({ ok: r.ok, texto: r.mensaje }) })

  return (
    <div aria-busy={pendiente}>
      <div className="semana">
        {dias.map((d) => {
          const del = asignaciones.filter((a) => a.fecha === d.fecha)
          return (
            <section key={d.fecha} className={`dia ${d.fecha === hoy ? 'hoy' : ''}`} aria-label={d.etiqueta}>
              <header>
                <strong>{d.etiqueta}</strong>
                {editable && <button type="button" className="secundario" onClick={() => agregarEn(d.fecha)} aria-label={`Agregar persona el ${d.etiqueta}`}>+</button>}
              </header>
              {del.length === 0 && <span className="vacio">Sin asignaciones</span>}
              {del.map((a) => (
                <div className={`asig ${a.cumplido ? 'ok' : ''}`} key={a.id}>
                  <b>{a.persona}</b>{a.es_cambio && <span className="etiqueta-cambio">Cambio</span>}
                  <div className="hora">{a.hora_desde.slice(0, 5)} a {a.hora_hasta.slice(0, 5)}</div>
                  {a.observaciones && <div className="obs">{a.observaciones}</div>}
                  {editable ? (
                    <label className="cumplido">
                      <input type="checkbox" checked={a.cumplido} disabled={pendiente} onChange={(e) => marcar(a, e.target.checked)} />
                      Cumplido
                    </label>
                  ) : a.cumplido ? <div className="cumplido">✓ Cumplido</div> : null}
                  {editable && (
                    <div className="acciones">
                      <button type="button" className="secundario" onClick={() => editar(a)}>Editar</button>
                      <button type="button" className="peligro" onClick={() => quitar(a)}>Quitar</button>
                    </div>
                  )}
                </div>
              ))}
            </section>
          )
        })}
      </div>

      {editable && (
        <section className="area" ref={panel} style={{ marginBottom: '1.5rem' }}>
          <h2>{f.id ? 'Editar asignación' : 'Agregar persona al calendario'}</h2>
          <form onSubmit={enviar}>
            <div className="fila-campos">
              <div className="campo"><label htmlFor="fecha">Día</label>
                <select id="fecha" value={f.fecha} onChange={(e) => setF({ ...f, fecha: e.target.value })}>
                  {dias.map((d) => <option key={d.fecha} value={d.fecha}>{d.etiqueta}</option>)}
                </select></div>
              <div className="campo"><label htmlFor="persona">Persona</label>
                <input id="persona" list="personas" required value={f.persona} onChange={(e) => setF({ ...f, persona: e.target.value })} />
                <datalist id="personas">{personas.map((p) => <option key={p} value={p} />)}</datalist></div>
            </div>
            <div className="fila-campos">
              <div className="campo"><label htmlFor="desde">Desde</label>
                <input id="desde" type="time" required value={f.desde} onChange={(e) => setF({ ...f, desde: e.target.value })} /></div>
              <div className="campo"><label htmlFor="hasta">Hasta (si termina al día siguiente, igual cargá la hora de fin)</label>
                <input id="hasta" type="time" required value={f.hasta} onChange={(e) => setF({ ...f, hasta: e.target.value })} /></div>
            </div>
            <div className="campo"><label htmlFor="obs">Observaciones</label>
              <input id="obs" value={f.observaciones} onChange={(e) => setF({ ...f, observaciones: e.target.value })} /></div>
            <div className="campo checks"><label><input type="checkbox" checked={f.es_cambio} onChange={(e) => setF({ ...f, es_cambio: e.target.checked })} />
              Es un cambio respecto de lo programado</label></div>
            <div className="acciones">
              <button type="submit" disabled={pendiente}>{pendiente ? 'Guardando…' : f.id ? 'Guardar cambio' : 'Agregar'}</button>
              {f.id && <button type="button" className="secundario" onClick={() => { setF({ ...vacio, fecha: f.fecha }); setMsg(null) }}>Cancelar edición</button>}
              <button type="button" className="secundario" disabled={pendiente} onClick={copiar}>Copiar la semana anterior</button>
              {msg && <span role="status" className={msg.ok ? 'mensaje-ok' : 'mensaje-error'}>{msg.texto}</span>}
            </div>
          </form>
        </section>
      )}
    </div>
  )
}
