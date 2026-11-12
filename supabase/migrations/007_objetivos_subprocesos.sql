-- Werchow · Ajustes: subprocesos que finalizan la gestión y meses editables de objetivos
-- Ejecutar UNA sola vez.

-- Un paso o subproceso puede dar por finalizada la gestión
alter table public.procesos add column finaliza boolean not null default false;

-- Los responsables solo pueden cargar, modificar o borrar objetivos del mes actual y del mes anterior.
-- Los meses más antiguos solo los puede modificar o borrar el administrador.
create or replace function public.mes_editable(p date) returns boolean
language sql stable as
$$ select p >= (date_trunc('month', current_date) - interval '1 month')::date $$;

drop policy if exists objetivos_insertar on public.objetivos_mensuales;
drop policy if exists objetivos_actualizar on public.objetivos_mensuales;
drop policy if exists objetivos_borrar on public.objetivos_mensuales;

create policy objetivos_insertar on public.objetivos_mensuales for insert to authenticated
  with check (es_admin() or (puede_cargar(area) and mes_editable(periodo)));
create policy objetivos_actualizar on public.objetivos_mensuales for update to authenticated
  using (es_admin() or (puede_cargar(area) and mes_editable(periodo)))
  with check (es_admin() or (puede_cargar(area) and mes_editable(periodo)));
create policy objetivos_borrar on public.objetivos_mensuales for delete to authenticated
  using (es_admin() or (puede_cargar(area) and mes_editable(periodo)));
