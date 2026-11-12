-- Werchow · Etapa 4: procesos con subprocesos (Sepelio, Ventas y Administración) y módulo de RR.HH.
-- Requiere haber ejecutado antes 002, 003 y 004. Ejecutar UNA sola vez.

create or replace function public.puede_rrhh() returns boolean
language sql stable security definer set search_path = public as
$$ select es_admin() or coalesce(rol_actual() = 'rrhh', false) $$;

-- ===== Procesos y guías con subprocesos (reemplaza a pasos_procedimiento y guias_secciones) =====
create table public.procesos (
  id bigint generated always as identity primary key,
  area text not null,
  grupo text not null,              -- sepelio_procedimiento, ventas_guia, rrhh_politicas, rrhh_plan_carrera, rrhh_induccion
  padre_id bigint references public.procesos(id) on delete cascade,
  orden int not null,
  titulo text not null,
  descripcion text not null default '',
  tipo text not null default 'paso' check (tipo in ('paso','decision')),
  si_texto text,
  no_texto text,
  enlaces jsonb not null default '[]'::jsonb,
  actualizado_en timestamptz not null default now()
);
create index procesos_busqueda on public.procesos (grupo, padre_id, orden);
alter table public.procesos enable row level security;

create policy procesos_ver on public.procesos for select to authenticated
  using (es_admin() or area = any(areas_actual()) or (area = 'administracion' and rol_actual() = 'rrhh'));
create policy procesos_escribir on public.procesos for all to authenticated
  using (es_admin() or (area = 'administracion' and rol_actual() = 'rrhh'))
  with check (es_admin() or (area = 'administracion' and rol_actual() = 'rrhh'));

-- Se conservan los contenidos ya cargados (y las ediciones que hayas hecho)
insert into public.procesos (area, grupo, orden, titulo, descripcion, tipo, si_texto, no_texto, enlaces, actualizado_en)
select area, 'sepelio_procedimiento', orden, titulo, descripcion, tipo, si_texto, no_texto, enlaces, actualizado_en
from public.pasos_procedimiento where area = 'sepelio';

insert into public.procesos (area, grupo, orden, titulo, descripcion, tipo, enlaces, actualizado_en)
select area, 'ventas_guia', orden, titulo, contenido, 'paso', enlaces, actualizado_en
from public.guias_secciones where area = 'ventas';

-- ===== Recursos humanos (solo administrador y rol RR.HH.) =====
create table public.legajos (
  id bigint generated always as identity primary key,
  nombre text not null,
  dni text,
  cargo text,
  sector text,
  fecha_ingreso date,
  telefono text,
  email text,
  observaciones text,
  enlace_carpeta text,
  estado text not null default 'activo' check (estado in ('activo','baja')),
  creado_en timestamptz not null default now(),
  creado_por uuid default auth.uid()
);

create table public.busquedas (
  id bigint generated always as identity primary key,
  puesto text not null,
  sector text,
  vacantes int,
  estado text not null default 'abierta' check (estado in ('abierta','en_proceso','cubierta','cancelada')),
  fecha_apertura date not null default current_date,
  fecha_cierre date,
  requisitos text,
  observaciones text,
  enlace text,
  creado_por uuid default auth.uid()
);

create table public.evaluaciones (
  id bigint generated always as identity primary key,
  legajo_id bigint not null references public.legajos(id) on delete cascade,
  periodo text not null,
  puntaje numeric check (puntaje between 1 and 10),
  fortalezas text,
  a_mejorar text,
  objetivos text,
  evaluador text,
  fecha date not null default current_date,
  creado_por uuid default auth.uid()
);

create table public.memos (
  id bigint generated always as identity primary key,
  tipo text not null check (tipo in ('memo','notificacion','llamado_de_atencion')),
  legajo_id bigint references public.legajos(id) on delete set null,
  asunto text not null,
  contenido text,
  fecha date not null default current_date,
  estado text not null default 'emitido' check (estado in ('emitido','notificado')),
  enlace text,
  creado_por uuid default auth.uid()
);

create table public.minutas (
  id bigint generated always as identity primary key,
  fecha date not null default current_date,
  titulo text not null,
  participantes text,
  temas text,
  acuerdos text,
  pendientes text,
  estado text not null default 'borrador' check (estado in ('borrador','aprobada')),
  creado_por uuid default auth.uid()
);

do $$
declare t text;
begin
  foreach t in array array['legajos','busquedas','evaluaciones','memos','minutas'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for all to authenticated using (puede_rrhh()) with check (puede_rrhh())', t || '_rrhh', t);
  end loop;
end $$;
