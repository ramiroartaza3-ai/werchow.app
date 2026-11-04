import { notFound } from 'next/navigation'
import { supabaseServer } from '@/lib/supabase/server'
import { getPerfil, areasVisibles } from '@/lib/perfil'
import { INDICADORES, mesActual, nombreArea, puedeCargar, calcular, formatear } from '@/lib/indicadores'
import FormObjetivos from './FormObjetivos'

export default async function Objetivos({ params, searchParams }: { params: { area: string }; searchParams: { mes?: string } }) {
  const perfil = await getPerfil()
  const area = params.area
  if (!INDICADORES[area] || !areasVisibles(perfil).includes(area)) notFound()

  const mes = /^\d{4}-\d{2}$/.test(searchParams.mes ?? '') ? searchParams.mes! : mesActual()
  const editable = puedeCargar(perfil.rol, perfil.areas, area)

  const { data } = await supabaseServer().from('objetivos_mensuales')
    .select('indicador, detalle, valor').eq('area', area).eq('periodo', `${mes}-01`)
  const filas = (data ?? []).map((f) => ({ ...f, valor: Number(f.valor) }))

  return (
    <>
      <div className="barra">
        <div>
          <h1>Objetivos de {nombreArea(area)}</h1>
          <div className="suave">{editable ? 'Cargá los datos del mes.' : 'Solo lectura: la carga la hace el responsable del área.'}</div>
        </div>
        <form method="get">
          <label htmlFor="mes" className="suave" style={{ margin: 0 }}>Mes</label>
          <input id="mes" type="month" name="mes" defaultValue={mes} />
          <button type="submit" className="secundario">Ver</button>
        </form>
      </div>

      {editable ? (
        <FormObjetivos key={`${area}-${mes}`} area={area} mes={mes} indicadores={INDICADORES[area]} filas={filas} />
      ) : (
        <table>
          <tbody>
            {INDICADORES[area].map((ind) => (
              <tr key={ind.clave}><td>{ind.etiqueta}</td><td className="num">{formatear(ind, calcular(ind, filas))}</td></tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  )
}
