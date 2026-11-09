-- Werchow · Validación de turnos y guardias "efectivamente cumplidos"
-- Ejecutar UNA sola vez.

alter table public.asignaciones
  add column cumplido boolean not null default false,
  add column validado_por uuid references public.perfiles(id),
  add column validado_en timestamptz;
