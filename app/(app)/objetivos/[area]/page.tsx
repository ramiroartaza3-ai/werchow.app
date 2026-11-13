import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { supabaseServer } from '@/lib/supabase/server'
import { getPerfil, areasVisibles } from '@/lib/perfil'
import { INDICADORES, mesActual, mesAnterior, mesEditable, nombreArea, puedeCargar, calcular, formatear } from '@/lib/indicadores'
import { mesValido, nombreMes } from '@/lib/reportes'
import FormObjetivos from './FormObjetivos'

export default async function Objetivos({ params, searchParams }: { params: { area: string }; searchParams: { mes?: string } }) {
  const perfil = await getPerfil()
  if (perfil.rol === 'usuario') redirect('/inicio')
  const area = params.area
  if (!INDICADORES[area] || !areasVisibles(perfil).includes(area)) notFound()

  const actual = mesActual()
  const previo = mesAnterior(actual)
  const mes = mesValido(searchParams.mes) ? searchParams.mes : actual
  const esAdmin = perfil.rol === 'admin'
  const puede = puedeCargar(perfil.rol, perfil.areas, area)
  const mesCerrado = !esAdmin && !mesEditable(mes)
  const editable = puede && !mesCerrado

  const { data } = await supabaseServer().from('objetivos_mensuales')
    .select('indicador, detalle, valor').eq('area', area).eq('periodo', `${mes}-01`)
  const filas = (data ?? []).map((f) => ({ ...f, valor: Number(f.valor) }))

  const pestañas = [previo, actual]
  if (!pestañas.includes(mes)) pestañas.unshift(mes)

  return (
    <>
      <div className="barra">
        <div>
          <h1>Objetivos de {nombreArea(area)}</h1>
          <div className="suave">
            {mesCerrado && puede
              ? `${nombreMes(mes)} ya está cerrado: solo el administrador puede modificarlo.`
              : editable ? 'Elegí el mes y cargá los datos.' : 'Solo lectura: la carga la hace el responsable del área.'}
          </div>
        </div>
        {esAdmin && (
          <form method="get">
            <label htmlFor="mes" className="suave" style={{ margin: 0 }}>Otro mes</label>
            <input id="mes" type="month" name="mes" defaultValue={mes} />
            <button type="submit" className="secundario">Ver</button>
          </form>
        )}
      </div>

      <nav className="tabs-mes" aria-label="Mes de los datos">
        {pestañas.map((m) => (
          <Link key={m} href={`?mes=${m}`} className={m === mes ? 'activa' : ''} aria-current={m === mes ? 'page' : undefined}>{nombreMes(m)}</Link>
        ))}
      </nav>
      <h2 className="mes-activo">{editable ? 'Estás cargando los datos de' : 'Datos de'} {nombreMes(mes)}</h2>

      {editable ? (
        <FormObjetivos key={`${area}-${mes}`} area={area} mes={mes} indicadores={INDICADORES[area]} filas={filas} esAdmin={esAdmin} />
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
