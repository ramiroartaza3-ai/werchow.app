import { notFound } from 'next/navigation'
import CalendarioSemanal from '@/components/calendario/CalendarioSemanal'

const TIPOS = {
  turnos: { db: 'turno' as const, titulo: 'Turnos de Ventas', ayuda: 'Asignación semanal de turnos del equipo de ventas.' },
  guardias: { db: 'guardia' as const, titulo: 'Guardias de Ventas', ayuda: 'Asignación semanal de guardias del equipo de ventas.' },
}

export default function Calendario({ params, searchParams }: { params: { tipo: string }; searchParams: { semana?: string } }) {
  const cfg = TIPOS[params.tipo as keyof typeof TIPOS]
  if (!cfg) notFound()
  return <CalendarioSemanal area="ventas" tipoDb={cfg.db} titulo={cfg.titulo} ayuda={cfg.ayuda}
    responsable="Ventas" semana={searchParams.semana} />
}
