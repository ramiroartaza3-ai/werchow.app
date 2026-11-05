import { notFound } from 'next/navigation'
import CalendarioSemanal from '@/components/calendario/CalendarioSemanal'

const TIPOS = {
  turnos: { db: 'turno' as const, titulo: 'Turnos de Sepelio', ayuda: 'Asignación semanal de turnos del personal.' },
  guardias: { db: 'guardia' as const, titulo: 'Guardias de Sepelio', ayuda: 'Asignación semanal de guardias del personal.' },
}

export default function Calendario({ params, searchParams }: { params: { tipo: string }; searchParams: { semana?: string } }) {
  const cfg = TIPOS[params.tipo as keyof typeof TIPOS]
  if (!cfg) notFound()
  return <CalendarioSemanal area="sepelio" tipoDb={cfg.db} titulo={cfg.titulo} ayuda={cfg.ayuda}
    responsable="Sepelio" semana={searchParams.semana} />
}
