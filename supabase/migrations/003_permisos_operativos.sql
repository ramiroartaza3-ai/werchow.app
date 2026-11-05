-- Werchow · Perfiles operativos (rol "usuario"): solo ven indicadores informativos de sus áreas.
-- Los demás roles siguen viendo todos los indicadores de sus áreas.
-- Si cambiás los indicadores marcados con "resumen: true" en lib/indicadores.ts, actualizá esta lista.

drop policy if exists objetivos_ver on public.objetivos_mensuales;

create policy objetivos_ver on public.objetivos_mensuales for select to authenticated
using (
  es_admin()
  or (
    area = any(areas_actual())
    and (
      rol_actual() <> 'usuario'
      or indicador in (
        'fichas_nuevas', 'referidos', 'satisfaccion',
        'servicios', 'actividades__num', 'actividades__den',
        'turnos', 'consultorios__num', 'consultorios__den'
      )
    )
  )
);
