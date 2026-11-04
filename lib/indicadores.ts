// Definición de áreas e indicadores mensuales. Para agregar o cambiar un indicador, se edita acá.

export type Tipo = 'numero' | 'monto' | 'porcentaje' | 'ratio'

export type Indicador = {
  clave: string
  etiqueta: string
  tipo: Tipo
  // ratio: se cargan dos números y la app calcula el %
  numLabel?: string
  denLabel?: string
  denEsResto?: boolean // true: % = num / (num + den)
  porVehiculo?: boolean // se carga una fila por vehículo y se suma
  ayuda?: string
}

export const AREAS = [
  { clave: 'ventas', nombre: 'Ventas' },
  { clave: 'sepelio', nombre: 'Sepelio' },
  { clave: 'administracion', nombre: 'Administración' },
  { clave: 'salud', nombre: 'Salud' },
] as const

export const nombreArea = (clave: string) => AREAS.find((a) => a.clave === clave)?.nombre ?? clave

export const ROLES = [
  { clave: 'admin', nombre: 'Administrador' },
  { clave: 'responsable_ventas', nombre: 'Responsable de Ventas' },
  { clave: 'responsable_sepelio', nombre: 'Responsable de Sepelio' },
  { clave: 'responsable_salud', nombre: 'Responsable de Salud' },
  { clave: 'rrhh', nombre: 'Recursos Humanos' },
  { clave: 'usuario', nombre: 'Usuario' },
] as const

export const INDICADORES: Record<string, Indicador[]> = {
  ventas: [
    { clave: 'fichas_nuevas', etiqueta: 'Cantidad de fichas nuevas', tipo: 'numero' },
    { clave: 'facturacion', etiqueta: 'Monto de facturación', tipo: 'monto' },
    { clave: 'fichas_facturadas', etiqueta: 'Fichas facturadas sobre fichas cargadas', tipo: 'ratio', numLabel: 'Fichas facturadas', denLabel: 'Fichas cargadas' },
    { clave: 'vendedores_objetivo', etiqueta: 'Vendedores que llegaron al objetivo', tipo: 'ratio', numLabel: 'Llegaron al objetivo', denLabel: 'No llegaron', denEsResto: true },
    { clave: 'gastos', etiqueta: 'Gastos del mes', tipo: 'monto' },
    { clave: 'clientes_adheridos', etiqueta: 'Clientes adheridos sobre clientes contactados', tipo: 'ratio', numLabel: 'Clientes adheridos', denLabel: 'Clientes contactados' },
    { clave: 'efectividad_m2', etiqueta: 'Efectividad de clientes nuevos al mes 2', tipo: 'porcentaje' },
    { clave: 'efectividad_m4', etiqueta: 'Efectividad de clientes nuevos al mes 4', tipo: 'porcentaje' },
    { clave: 'efectividad_m7', etiqueta: 'Efectividad de clientes nuevos al mes 7', tipo: 'porcentaje' },
    { clave: 'premios', etiqueta: 'Premios por objetivos', tipo: 'monto' },
    { clave: 'satisfaccion', etiqueta: 'Satisfacción del cliente', tipo: 'porcentaje' },
    { clave: 'referidos', etiqueta: 'Referidos obtenidos', tipo: 'numero' },
  ],
  sepelio: [
    { clave: 'combustible_litros', etiqueta: 'Litros de combustible consumidos', tipo: 'numero' },
    { clave: 'km_vehiculo', etiqueta: 'Kilómetros realizados por vehículo', tipo: 'numero', porVehiculo: true },
    { clave: 'hs_extra_taller', etiqueta: 'Horas extras de taller', tipo: 'numero' },
    { clave: 'hs_extra_admin', etiqueta: 'Horas extras de administración', tipo: 'numero' },
    { clave: 'servicios', etiqueta: 'Cantidad de servicios', tipo: 'numero' },
    { clave: 'actividades', etiqueta: 'Actividades realizadas sobre programadas', tipo: 'ratio', numLabel: 'Realizadas', denLabel: 'Programadas' },
    { clave: 'ventas_particulares', etiqueta: 'Ventas particulares realizadas', tipo: 'numero' },
    { clave: 'satisfaccion', etiqueta: 'Satisfacción del cliente', tipo: 'porcentaje' },
  ],
  salud: [
    { clave: 'turnos', etiqueta: 'Cantidad de turnos', tipo: 'numero' },
    { clave: 'consultorios', etiqueta: 'Consultorios ocupados sobre el total', tipo: 'ratio', numLabel: 'Ocupados', denLabel: 'Total de consultorios' },
    { clave: 'ingresos_edificio', etiqueta: 'Personas que ingresaron al edificio', tipo: 'numero' },
    { clave: 'especialidades', etiqueta: 'Especialidades disponibles', tipo: 'numero' },
    { clave: 'satisfaccion', etiqueta: 'Satisfacción del cliente', tipo: 'porcentaje' },
  ],
}

export type Fila = { indicador: string; detalle: string; valor: number }

export function calcular(ind: Indicador, filas: Fila[]): number | null {
  const de = (clave: string) => filas.filter((f) => f.indicador === clave)
  if (ind.tipo === 'ratio') {
    const n = de(`${ind.clave}__num`)
    const d = de(`${ind.clave}__den`)
    if (!n.length || !d.length) return null
    const num = n.reduce((s, f) => s + Number(f.valor), 0)
    const den = d.reduce((s, f) => s + Number(f.valor), 0)
    const base = ind.denEsResto ? num + den : den
    return base === 0 ? null : (num / base) * 100
  }
  const f = de(ind.clave)
  if (!f.length) return null
  const suma = f.reduce((s, x) => s + Number(x.valor), 0)
  return ind.tipo === 'porcentaje' ? suma / f.length : suma
}

export function formatear(ind: Indicador, v: number | null): string {
  if (v === null) return 'Sin datos'
  if (ind.tipo === 'monto') return '$ ' + v.toLocaleString('es-AR', { maximumFractionDigits: 0 })
  if (ind.tipo === 'porcentaje' || ind.tipo === 'ratio') return v.toLocaleString('es-AR', { maximumFractionDigits: 1 }) + ' %'
  return v.toLocaleString('es-AR', { maximumFractionDigits: 1 })
}

export function mesActual(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function mesAnterior(mes: string): string {
  const [y, m] = mes.split('-').map(Number)
  const d = new Date(y, m - 2, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// Espejo en el cliente de la función puede_cargar() de la base. La base es la que manda (RLS).
export function puedeCargar(rol: string, areas: string[], area: string): boolean {
  if (rol === 'admin') return true
  if (area === 'administracion') return rol === 'rrhh'
  return rol === `responsable_${area}` && areas.includes(area)
}
