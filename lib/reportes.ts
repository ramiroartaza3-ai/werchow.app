import { parse, sumarDias } from '@/lib/fechas'
import { mesAnterior } from '@/lib/indicadores'

export const BOM = '\uFEFF'

// CSV con ";" como separador y coma decimal: se abre directo en Excel en español
export function csv(filas: (string | number | null | undefined)[][]): string {
  return filas
    .map((f) => f.map((c) => {
      const s = c === null || c === undefined ? '' : String(c)
      return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    }).join(';'))
    .join('\r\n')
}

export const num = (n: number | null, dec = 2): string =>
  n === null ? '' : String(Math.round(n * 10 ** dec) / 10 ** dec).replace('.', ',')

export const mesValido = (s: string | null | undefined): s is string => !!s && /^\d{4}-(0[1-9]|1[0-2])$/.test(s)

export const nombreMes = (mes: string) =>
  parse(`${mes}-15`).toLocaleDateString('es-AR', { month: 'long', year: 'numeric', timeZone: 'UTC' })
export const nombreMesCorto = (mes: string) =>
  parse(`${mes}-15`).toLocaleDateString('es-AR', { month: 'short', timeZone: 'UTC' }).replace('.', '')

// Últimos n meses (en orden cronológico) terminando en `mes`
export function mesesHasta(mes: string, n: number): string[] {
  const r = [mes]
  while (r.length < n) r.unshift(mesAnterior(r[0]))
  return r
}

// De enero hasta `mes` del mismo año (para el acumulado anual)
export function mesesDelAnio(mes: string): string[] {
  const y = mes.slice(0, 4)
  return Array.from({ length: Number(mes.slice(5)) }, (_, i) => `${y}-${String(i + 1).padStart(2, '0')}`)
}

export function diasDelMes(mes: string): string[] {
  const dias: string[] = []
  let d = `${mes}-01`
  while (d.startsWith(mes)) { dias.push(d); d = sumarDias(d, 1) }
  return dias
}

// Minutos entre dos horas; si la hora de fin es igual o anterior a la de inicio, termina al día siguiente
export function minutosEntre(desde: string, hasta: string): number {
  const [h1, m1] = desde.split(':').map(Number)
  const [h2, m2] = hasta.split(':').map(Number)
  let d = h2 * 60 + m2 - (h1 * 60 + m1)
  if (d <= 0) d += 1440
  return d
}
export const horasTexto = (min: number) => `${Math.floor(min / 60)}:${String(Math.round(min % 60)).padStart(2, '0')}`

// Base de cálculo de la ficha: solo lo marcado como cumplido, o todo lo programado
export type BaseFicha = 'cumplido' | 'programado'
export const baseValida = (s: string | null | undefined): BaseFicha => (s === 'programado' ? 'programado' : 'cumplido')

export type TipoAsig = 'turno' | 'guardia' | 'horario'
export const TIPOS_POR_AREA: Record<string, TipoAsig[]> = {
  sepelio: ['turno', 'guardia'],
  ventas: ['turno', 'guardia'],
  salud: ['horario'],
}
export const ETIQUETA_TIPO: Record<TipoAsig, { singular: string; plural: string }> = {
  turno: { singular: 'Turno', plural: 'Turnos' },
  guardia: { singular: 'Guardia', plural: 'Guardias' },
  horario: { singular: 'Horario', plural: 'Horarios' },
}

// Quién puede ver y descargar la ficha mensual de horarios de un área (coincide con los permisos de la base)
export const puedeVerFicha = (rol: string, areas: string[], area: string) =>
  rol === 'admin' || (areas.includes(area) && (rol === `responsable_${area}` || rol === 'rrhh'))
