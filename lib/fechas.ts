// Fechas en formato AAAA-MM-DD, calculadas en UTC para evitar corrimientos por zona horaria.
export const iso = (d: Date) => d.toISOString().slice(0, 10)

export function parse(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

export const valida = (s: string | undefined): s is string =>
  !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(parse(s).getTime())

export function sumarDias(s: string, n: number): string {
  const d = parse(s)
  d.setUTCDate(d.getUTCDate() + n)
  return iso(d)
}

export function lunesDe(s: string): string {
  const d = parse(s)
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7))
  return iso(d)
}

// "Hoy" en Argentina (UTC-3)
export const hoy = () => iso(new Date(Date.now() - 3 * 3600 * 1000))

export const etiquetaDia = (s: string) =>
  parse(s).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'numeric', timeZone: 'UTC' })

export const etiquetaCorta = (s: string) =>
  parse(s).toLocaleDateString('es-AR', { day: 'numeric', month: 'numeric', timeZone: 'UTC' })
