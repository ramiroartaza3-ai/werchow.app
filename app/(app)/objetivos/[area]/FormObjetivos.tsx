'use client'
import { useState } from 'react'
import type { Indicador } from '@/lib/indicadores'
import { guardarObjetivos, borrarIndicadorMes, borrarObjetivosMes } from './actions'

type Fila = { indicador: string; detalle: string; valor: number }
type Vehiculos = Record<string, { detalle: string; valor: string }[]>

export default function FormObjetivos({ area, mes, indicadores, filas, esAdmin }: {
  area: string; mes: string; indicadores: Indicador[]; filas: Fila[]; esAdmin: boolean
}) {
  // Los indicadores calculados solos (derivados) no se cargan a mano
  const cargables = indicadores.filter((i) => !i.derivado)

  // Valores simples: clave → texto. Los porcentajes con dos números usan clave__num y clave__den.
  const inicial: Record<string, string> = {}
  filas.filter((f) => f.detalle === '').forEach((f) => { inicial[f.indicador] = String(f.valor) })
  const [valores, setValores] = useState(inicial)

  const vehiculosVacios = (): Vehiculos => {
    const r: Vehiculos = {}
    cargables.filter((i) => i.porVehiculo).forEach((i) => { r[i.clave] = [{ detalle: '', valor: '' }] })
    return r
  }
  const [vehiculos, setVehiculos] = useState<Vehiculos>(() => {
    const r = vehiculosVacios()
    cargables.filter((i) => i.porVehiculo).forEach((i) => {
      const f = filas.filter((x) => x.indicador === i.clave && x.detalle !== '')
      if (f.length) r[i.clave] = f.map((x) => ({ detalle: x.detalle, valor: String(x.valor) }))
    })
    return r
  })

  const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string } | null>(null)
  const [guardando, setGuardando] = useState(false)
  const set = (k: string, v: string) => setValores((p) => ({ ...p, [k]: v }))

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setGuardando(true); setMensaje(null)
    const items: { indicador: string; detalle: string; valor: number }[] = []
    for (const [k, v] of Object.entries(valores)) {
      if (v.trim() !== '') items.push({ indicador: k, detalle: '', valor: Number(v.replace(',', '.')) })
    }
    for (const [k, lista] of Object.entries(vehiculos)) {
      for (const x of lista) {
        if (x.detalle.trim() && x.valor.trim() !== '') items.push({ indicador: k, detalle: x.detalle.trim(), valor: Number(x.valor.replace(',', '.')) })
      }
    }
    const r = await guardarObjetivos(area, mes, items)
    setMensaje({ ok: r.ok, texto: r.mensaje })
    setGuardando(false)
  }

  const clavesDe = (ind: Indicador) => (ind.tipo === 'ratio' ? [`${ind.clave}__num`, `${ind.clave}__den`] : [ind.clave])

  // Solo administrador
  async function borrarDato(ind: Indicador) {
    if (!window.confirm(`¿Borrar "${ind.etiqueta}" de este mes? No se puede deshacer.`)) return
    setGuardando(true); setMensaje(null)
    const claves = clavesDe(ind)
    const r = await borrarIndicadorMes(area, mes, claves)
    if (r.ok) {
      setValores((p) => { const n = { ...p }; claves.forEach((c) => delete n[c]); return n })
      if (ind.porVehiculo) setVehiculos((p) => ({ ...p, [ind.clave]: [{ detalle: '', valor: '' }] }))
    }
    setMensaje({ ok: r.ok, texto: r.mensaje })
    setGuardando(false)
  }

  async function borrarMes() {
    if (!window.confirm('¿Borrar TODOS los objetivos de esta área en este mes? No se puede deshacer.')) return
    setGuardando(true); setMensaje(null)
    const r = await borrarObjetivosMes(area, mes)
    if (r.ok) { setValores({}); setVehiculos(vehiculosVacios()) }
    setMensaje({ ok: r.ok, texto: r.mensaje })
    setGuardando(false)
  }

  const campo = (id: string, etiqueta: string) => (
    <div className="campo" key={id}>
      <label htmlFor={id}>{etiqueta}</label>
      <input id={id} type="number" inputMode="decimal" step="any" min="0" value={valores[id] ?? ''} onChange={(e) => set(id, e.target.value)} />
    </div>
  )

  return (
    <form onSubmit={enviar}>
      {cargables.map((ind) => (
        <div className="grupo-ind" key={ind.clave}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'baseline' }}>
            <h2>{ind.etiqueta}</h2>
            {esAdmin && <button type="button" className="peligro" disabled={guardando} onClick={() => borrarDato(ind)}>Borrar este dato</button>}
          </div>
          {ind.tipo === 'ratio' && (
            <div className="fila-campos">
              {campo(`${ind.clave}__num`, ind.numLabel ?? 'Cantidad')}
              {campo(`${ind.clave}__den`, ind.denLabel ?? 'Total')}
            </div>
          )}
          {ind.porVehiculo && (
            <>
              {vehiculos[ind.clave].map((v, i) => (
                <div className="vehiculo" key={i}>
                  <input aria-label="Vehículo (patente o nombre)" placeholder="Vehículo (patente o nombre)" value={v.detalle}
                    onChange={(e) => setVehiculos((p) => ({ ...p, [ind.clave]: p[ind.clave].map((x, j) => j === i ? { ...x, detalle: e.target.value } : x) }))} />
                  <input aria-label="Kilómetros" type="number" inputMode="decimal" min="0" placeholder="Kilómetros" value={v.valor}
                    onChange={(e) => setVehiculos((p) => ({ ...p, [ind.clave]: p[ind.clave].map((x, j) => j === i ? { ...x, valor: e.target.value } : x) }))} />
                  <button type="button" className="secundario" aria-label="Quitar vehículo"
                    onClick={() => setVehiculos((p) => ({ ...p, [ind.clave]: p[ind.clave].length > 1 ? p[ind.clave].filter((_, j) => j !== i) : [{ detalle: '', valor: '' }] }))}>Quitar</button>
                </div>
              ))}
              <button type="button" className="secundario"
                onClick={() => setVehiculos((p) => ({ ...p, [ind.clave]: [...p[ind.clave], { detalle: '', valor: '' }] }))}>Agregar vehículo</button>
            </>
          )}
          {ind.tipo !== 'ratio' && !ind.porVehiculo &&
            campo(ind.clave, ind.tipo === 'monto' ? 'Monto en $' : ind.tipo === 'porcentaje' ? 'Porcentaje (0 a 100)' : 'Cantidad')}
        </div>
      ))}

      {indicadores.some((i) => i.derivado) && (
        <p className="suave">Los datos calculados solos (por ejemplo, pacientes particulares) se arman a partir de los que cargás acá y aparecen en el panel.</p>
      )}

      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '1rem', flexWrap: 'wrap' }}>
        <button type="submit" disabled={guardando}>{guardando ? 'Procesando…' : 'Guardar objetivos'}</button>
        {esAdmin && <button type="button" className="peligro" disabled={guardando} onClick={borrarMes}>Borrar todos los datos del mes</button>}
        {mensaje && <span role="status" className={mensaje.ok ? 'mensaje-ok' : 'mensaje-error'}>{mensaje.texto}</span>}
      </div>
    </form>
  )
}
