import { INDICADORES, calcular, formatear, type Indicador } from '@/lib/indicadores'
import { nombreMesCorto } from '@/lib/reportes'
import { filasDe, serieDe, type FilaObj } from '@/lib/objetivos-datos'
import { MiniGrafico, BarrasHorizontales, valorCompacto } from './Graficos'

export default function GraficosArea({ area, meses, datos }: { area: string; meses: string[]; datos: FilaObj[] }) {
  const mes = meses[meses.length - 1]
  const etiquetas = meses.map(nombreMesCorto)
  const del = filasDe(datos, area, mes)

  return (
    <>
      <div className="graficos">
        {INDICADORES[area].map((ind: Indicador) => {
          const serie = serieDe(ind, datos, area, meses)
          const actual = serie[serie.length - 1]
          return (
            <figure className="graf" key={ind.clave}>
              <figcaption>
                <span className="nombre">{ind.etiqueta}</span>
                <span className="valor">{formatear(ind, actual)}</span>
              </figcaption>
              <MiniGrafico valores={serie} etiquetas={etiquetas} titulo={ind.etiqueta}
                tipo={ind.tipo === 'porcentaje' || ind.tipo === 'ratio' ? 'linea' : 'barra'}
                formatoCompleto={(v) => formatear(ind, v)} formatoCorto={(v) => valorCompacto(ind.tipo, v)} />
            </figure>
          )
        })}
      </div>

      {INDICADORES[area].filter((i) => i.porVehiculo).map((ind) => {
        const items = del.filter((f) => f.indicador === ind.clave && f.detalle)
          .map((f) => ({ nombre: f.detalle, valor: Number(f.valor) })).sort((a, b) => b.valor - a.valor)
        if (!items.length) return null
        return (
          <div className="graf graf-ancho" key={`v-${ind.clave}`}>
            <div className="nombre">{ind.etiqueta} · mes seleccionado</div>
            <BarrasHorizontales items={items} formato={(v) => formatear({ ...ind, tipo: 'numero' }, v)} />
          </div>
        )
      })}
    </>
  )
}
