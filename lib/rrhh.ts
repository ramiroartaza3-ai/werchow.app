// Módulos de Recursos Humanos (cada uno guarda sus registros en una tabla propia).
export type Reg = Record<string, string | number | null | undefined>

export type Campo = {
  clave: string
  etiqueta: string
  tipo: 'texto' | 'textarea' | 'fecha' | 'numero' | 'select' | 'legajo' | 'url'
  opciones?: { valor: string; texto: string }[]
  requerido?: boolean
  defecto?: string // 'hoy' completa la fecha de hoy
}

export type Modulo = {
  clave: string
  tabla: string
  titulo: string
  ayuda: string
  nuevo: string
  campos: Campo[]
  principal: (r: Reg, legajo: string) => string
  ocultar: string[] // campos que ya se muestran en el título
  orden: { col: string; asc: boolean }
}

export const MODULOS: Record<string, Modulo> = {
  legajos: {
    clave: 'legajos', tabla: 'legajos', titulo: 'Legajos', nuevo: 'Nuevo legajo',
    ayuda: 'Ficha de cada persona de la empresa. Acceso solo para Administración y RR.HH.',
    principal: (r) => String(r.nombre ?? ''), ocultar: ['nombre'], orden: { col: 'nombre', asc: true },
    campos: [
      { clave: 'nombre', etiqueta: 'Nombre y apellido', tipo: 'texto', requerido: true },
      { clave: 'estado', etiqueta: 'Estado', tipo: 'select', requerido: true, defecto: 'activo',
        opciones: [{ valor: 'activo', texto: 'Activo' }, { valor: 'baja', texto: 'Baja' }] },
      { clave: 'fecha_ingreso', etiqueta: 'Fecha de ingreso', tipo: 'fecha' },
      { clave: 'dni', etiqueta: 'DNI', tipo: 'texto' },
      { clave: 'cargo', etiqueta: 'Cargo', tipo: 'texto' },
      { clave: 'sector', etiqueta: 'Sector', tipo: 'texto' },
      { clave: 'telefono', etiqueta: 'Teléfono', tipo: 'texto' },
      { clave: 'email', etiqueta: 'Correo', tipo: 'texto' },
      { clave: 'enlace_carpeta', etiqueta: 'Carpeta de documentos (enlace)', tipo: 'url' },
      { clave: 'observaciones', etiqueta: 'Observaciones', tipo: 'textarea' },
    ],
  },
  busquedas: {
    clave: 'busquedas', tabla: 'busquedas', titulo: 'Búsquedas de personal', nuevo: 'Nueva búsqueda',
    ayuda: 'Puestos a cubrir y estado de cada búsqueda.',
    principal: (r) => String(r.puesto ?? ''), ocultar: ['puesto'], orden: { col: 'fecha_apertura', asc: false },
    campos: [
      { clave: 'puesto', etiqueta: 'Puesto', tipo: 'texto', requerido: true },
      { clave: 'estado', etiqueta: 'Estado', tipo: 'select', requerido: true, defecto: 'abierta',
        opciones: [{ valor: 'abierta', texto: 'Abierta' }, { valor: 'en_proceso', texto: 'En proceso' },
          { valor: 'cubierta', texto: 'Cubierta' }, { valor: 'cancelada', texto: 'Cancelada' }] },
      { clave: 'sector', etiqueta: 'Sector', tipo: 'texto' },
      { clave: 'vacantes', etiqueta: 'Vacantes', tipo: 'numero' },
      { clave: 'fecha_apertura', etiqueta: 'Fecha de apertura', tipo: 'fecha', requerido: true, defecto: 'hoy' },
      { clave: 'fecha_cierre', etiqueta: 'Fecha de cierre', tipo: 'fecha' },
      { clave: 'requisitos', etiqueta: 'Requisitos del puesto', tipo: 'textarea' },
      { clave: 'observaciones', etiqueta: 'Observaciones', tipo: 'textarea' },
      { clave: 'enlace', etiqueta: 'Enlace (aviso, planilla de candidatos)', tipo: 'url' },
    ],
  },
  rendimiento: {
    clave: 'rendimiento', tabla: 'evaluaciones', titulo: 'Gestión del rendimiento', nuevo: 'Nueva evaluación',
    ayuda: 'Evaluaciones de desempeño por persona y período.',
    principal: (r, legajo) => `${legajo || 'Sin legajo'} · ${r.periodo ?? ''}`, ocultar: ['legajo_id', 'periodo'],
    orden: { col: 'fecha', asc: false },
    campos: [
      { clave: 'legajo_id', etiqueta: 'Persona (legajo)', tipo: 'legajo', requerido: true },
      { clave: 'periodo', etiqueta: 'Período evaluado (ej.: 2026 - 2.º semestre)', tipo: 'texto', requerido: true },
      { clave: 'fecha', etiqueta: 'Fecha de la evaluación', tipo: 'fecha', requerido: true, defecto: 'hoy' },
      { clave: 'puntaje', etiqueta: 'Puntaje (1 a 10)', tipo: 'numero' },
      { clave: 'evaluador', etiqueta: 'Evaluador', tipo: 'texto' },
      { clave: 'fortalezas', etiqueta: 'Fortalezas', tipo: 'textarea' },
      { clave: 'a_mejorar', etiqueta: 'Aspectos a mejorar', tipo: 'textarea' },
      { clave: 'objetivos', etiqueta: 'Objetivos acordados', tipo: 'textarea' },
    ],
  },
  memos: {
    clave: 'memos', tabla: 'memos', titulo: 'Memos y notificaciones', nuevo: 'Nuevo memo o notificación',
    ayuda: 'Memos generales, notificaciones y llamados de atención. Sin persona elegida, es un aviso general.',
    principal: (r) => String(r.asunto ?? ''), ocultar: ['asunto'], orden: { col: 'fecha', asc: false },
    campos: [
      { clave: 'asunto', etiqueta: 'Asunto', tipo: 'texto', requerido: true },
      { clave: 'tipo', etiqueta: 'Tipo', tipo: 'select', requerido: true, defecto: 'memo',
        opciones: [{ valor: 'memo', texto: 'Memo' }, { valor: 'notificacion', texto: 'Notificación' },
          { valor: 'llamado_de_atencion', texto: 'Llamado de atención' }] },
      { clave: 'legajo_id', etiqueta: 'Dirigido a (dejá vacío si es general)', tipo: 'legajo' },
      { clave: 'fecha', etiqueta: 'Fecha', tipo: 'fecha', requerido: true, defecto: 'hoy' },
      { clave: 'estado', etiqueta: 'Estado', tipo: 'select', requerido: true, defecto: 'emitido',
        opciones: [{ valor: 'emitido', texto: 'Emitido' }, { valor: 'notificado', texto: 'Notificado' }] },
      { clave: 'contenido', etiqueta: 'Contenido', tipo: 'textarea' },
      { clave: 'enlace', etiqueta: 'Enlace al documento firmado', tipo: 'url' },
    ],
  },
  minutas: {
    clave: 'minutas', tabla: 'minutas', titulo: 'Minutas de reunión', nuevo: 'Nueva minuta',
    ayuda: 'Temas tratados, acuerdos y pendientes. Pasá la minuta a “Aprobada” cuando los temas queden aceptados.',
    principal: (r) => String(r.titulo ?? ''), ocultar: ['titulo'], orden: { col: 'fecha', asc: false },
    campos: [
      { clave: 'titulo', etiqueta: 'Título o motivo de la reunión', tipo: 'texto', requerido: true },
      { clave: 'fecha', etiqueta: 'Fecha', tipo: 'fecha', requerido: true, defecto: 'hoy' },
      { clave: 'estado', etiqueta: 'Estado', tipo: 'select', requerido: true, defecto: 'borrador',
        opciones: [{ valor: 'borrador', texto: 'Borrador' }, { valor: 'aprobada', texto: 'Aprobada' }] },
      { clave: 'participantes', etiqueta: 'Participantes', tipo: 'textarea' },
      { clave: 'temas', etiqueta: 'Temas tratados', tipo: 'textarea' },
      { clave: 'acuerdos', etiqueta: 'Acuerdos y decisiones', tipo: 'textarea' },
      { clave: 'pendientes', etiqueta: 'Pendientes y responsables', tipo: 'textarea' },
    ],
  },
}
