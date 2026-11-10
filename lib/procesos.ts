// Procesos y guías con subprocesos. Cada grupo es una guía independiente.
export type Enlace = { texto: string; url: string }

export type Nodo = {
  id: number; padre_id: number | null; orden: number; titulo: string; descripcion: string
  tipo: 'paso' | 'decision'; si_texto: string | null; no_texto: string | null; enlaces: Enlace[]
}

export type NodoInput = {
  id?: number; padre_id: number | null; titulo: string; descripcion: string
  tipo: 'paso' | 'decision'; si_texto: string; no_texto: string; enlaces: Enlace[]
}

export const GRUPOS = {
  sepelio_procedimiento: { area: 'sepelio', ruta: '/sepelio/procedimiento' },
  ventas_guia: { area: 'ventas', ruta: '/ventas/guia' },
  rrhh_politicas: { area: 'administracion', ruta: '/rrhh/politicas' },
  rrhh_plan_carrera: { area: 'administracion', ruta: '/rrhh/plan-carrera' },
  rrhh_induccion: { area: 'administracion', ruta: '/rrhh/induccion' },
} as const

export type GrupoClave = keyof typeof GRUPOS

export const MAX_NIVEL = 3 // niveles de subprocesos debajo de cada proceso principal
