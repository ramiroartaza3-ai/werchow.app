import CalendarioSemanal from '@/components/calendario/CalendarioSemanal'

export default function Horarios({ searchParams }: { searchParams: { semana?: string } }) {
  return <CalendarioSemanal area="salud" tipoDb="horario" titulo="Horarios de la administración de Salud"
    ayuda="Asignación semanal de horarios del personal administrativo." responsable="Salud" semana={searchParams.semana} />
}
