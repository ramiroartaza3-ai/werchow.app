import type { Tipo } from '@/lib/indicadores'

export function valorCompacto(tipo: Tipo, v: number): string {
  if (tipo === 'porcentaje' || tipo === 'ratio') return `${Math.round(v)}%`
  const f = (n: number) => n.toLocaleString('es-AR', { maximumFractionDigits: 1 })
  const a = Math.abs(v)
  if (a >= 1e6) return `${f(v / 1e6)} M`
  if (a >= 1e4) return `${f(v / 1e3)} mil`
  return f(v)
}

// Gráfico de barras o de línea de los últimos meses (SVG, sin librerías)
export function MiniGrafico({ valores, etiquetas, tipo, titulo, formatoCompleto, formatoCorto }: {
  valores: (number | null)[]; etiquetas: string[]; tipo: 'barra' | 'linea'; titulo: string
  formatoCompleto: (n: number | null) => string; formatoCorto: (n: number) => string
}) {
  const W = 280, H = 130, pl = 10, pr = 10, pt = 20, pb = 24
  const n = valores.length
  const max = tipo === 'linea' ? 100 : Math.max(1, ...valores.map((v) => v ?? 0))
  const iw = (W - pl - pr) / n
  const base = H - pb
  const y = (v: number) => pt + (base - pt) * (1 - Math.min(Math.max(v, 0), max) / max)
  const cx = (i: number) => pl + i * iw + iw / 2
  const descripcion = etiquetas.map((e, i) => `${e}: ${formatoCompleto(valores[i])}`).join('. ')

  // Tramos continuos de la línea (se corta donde no hay datos)
  const tramos: { x: number; y: number }[][] = []
  if (tipo === 'linea') {
    valores.forEach((v, i) => {
      if (v === null) { tramos.push([]); return }
      if (!tramos.length) tramos.push([])
      tramos[tramos.length - 1].push({ x: cx(i), y: y(v) })
    })
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${titulo}. ${descripcion}`} className="mini-grafico">
      <line x1={pl} x2={W - pr} y1={base} y2={base} style={{ stroke: 'var(--linea)' }} />
      {tipo === 'barra' && valores.map((v, i) => v === null ? null : (
        <g key={i}>
          <rect x={pl + i * iw + iw * 0.18} width={iw * 0.64} y={y(v)} height={Math.max(base - y(v), 1)} rx={2}
            style={{ fill: 'var(--acento)', opacity: i === n - 1 ? 1 : 0.45 }}><title>{`${etiquetas[i]}: ${formatoCompleto(v)}`}</title></rect>
          {(n <= 7 || i === n - 1) && <text x={cx(i)} y={y(v) - 4} textAnchor="middle" fontSize="10" style={{ fill: 'var(--tinta)' }}>{formatoCorto(v)}</text>}
        </g>
      ))}
      {tipo === 'linea' && tramos.map((t, k) => t.length > 1 && (
        <polyline key={k} fill="none" strokeWidth={2} points={t.map((p) => `${p.x},${p.y}`).join(' ')} style={{ stroke: 'var(--acento)' }} />
      ))}
      {tipo === 'linea' && valores.map((v, i) => v === null ? null : (
        <g key={i}>
          <circle cx={cx(i)} cy={y(v)} r={i === n - 1 ? 4 : 3} style={{ fill: 'var(--acento)' }}><title>{`${etiquetas[i]}: ${formatoCompleto(v)}`}</title></circle>
          {(n <= 7 || i === n - 1) && <text x={cx(i)} y={y(v) - 8} textAnchor="middle" fontSize="10" style={{ fill: 'var(--tinta)' }}>{formatoCorto(v)}</text>}
        </g>
      ))}
      {valores.map((v, i) => (
        <text key={`e${i}`} x={cx(i)} y={H - 7} textAnchor="middle" fontSize="10" style={{ fill: v === null ? 'var(--suave)' : 'var(--tinta)' }}>
          {etiquetas[i]}
        </text>
      ))}
    </svg>
  )
}

export function BarrasHorizontales({ items, formato }: { items: { nombre: string; valor: number }[]; formato: (n: number) => string }) {
  const max = Math.max(1, ...items.map((i) => i.valor))
  return (
    <div className="barras-h">
      {items.map((i) => (
        <div className="barra-h" key={i.nombre}>
          <span className="nombre">{i.nombre}</span>
          <span className="pista"><span className="relleno" style={{ width: `${(i.valor / max) * 100}%` }} /></span>
          <span className="valor">{formato(i.valor)}</span>
        </div>
      ))}
    </div>
  )
}
