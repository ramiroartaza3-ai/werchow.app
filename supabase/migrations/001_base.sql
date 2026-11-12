-- Werchow · Etapa 1: perfiles, roles y objetivos mensuales

create table public.perfiles (
  id uuid primary key references auth.users on delete cascade,
  email text not null,
  nombre text,
  rol text not null default 'usuario'
    check (rol in ('admin','responsable_ventas','responsable_sepelio','responsable_salud','rrhh','usuario')),
  areas text[] not null default '{}',
  activo boolean not null default true,
  cambiar_clave boolean not null default false,
  creado_en timestamptz not null default now()
);

create table public.objetivos_mensuales (
  id bigint generated always as identity primary key,
  area text not null check (area in ('ventas','sepelio','salud','administracion')),
  periodo date not null,                       -- siempre el día 1 del mes
  indicador text not null,
  detalle text not null default '',            -- ej.: vehículo en "km por vehículo"
  valor numeric not null,
  cargado_por uuid references public.perfiles(id),
  actualizado_en timestamptz not null default now(),
  unique (area, periodo, indicador, detalle)
);

-- Funciones de ayuda (security definer para evitar recursión en RLS)
create or replace function public.rol_actual() returns text
language sql stable security definer set search_path = public as
$$ select rol from perfiles where id = auth.uid() and activo $$;

create or replace function public.areas_actual() returns text[]
language sql stable security definer set search_path = public as
$$ select coalesce(areas, '{}') from perfiles where id = auth.uid() and activo $$;

create or replace function public.es_admin() returns boolean
language sql stable security definer set search_path = public as
$$ select coalesce(rol_actual() = 'admin', false) $$;

create or replace function public.puede_cargar(a text) returns boolean
language sql stable security definer set search_path = public as $$
  select es_admin()
      or (rol_actual() = 'responsable_' || a and a = any(areas_actual()))
      or (a = 'administracion' and rol_actual() = 'rrhh')
$$;

create or replace function public.marcar_clave_cambiada() returns void
language sql security definer set search_path = public as
$$ update perfiles set cambiar_clave = false where id = auth.uid() $$;

-- Crea el perfil automáticamente cuando se crea un usuario en Auth
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into perfiles (id, email, nombre, rol, areas, cambiar_clave)
  values (
    new.id, new.email,
    coalesce(new.raw_user_meta_data->>'nombre', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'rol', 'usuario'),
    coalesce(array(select jsonb_array_elements_text(new.raw_user_meta_data->'areas')), '{}'),
    coalesce((new.raw_user_meta_data->>'cambiar_clave')::boolean, false)
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

-- Row Level Security
alter table public.perfiles enable row level security;
alter table public.objetivos_mensuales enable row level security;

create policy perfiles_ver on public.perfiles for select to authenticated using (true);
create policy perfiles_admin_modifica on public.perfiles for all to authenticated
  using (es_admin()) with check (es_admin());

create policy objetivos_ver on public.objetivos_mensuales for select to authenticated
  using (es_admin() or area = any(areas_actual()));
create policy objetivos_insertar on public.objetivos_mensuales for insert to authenticated
  with check (puede_cargar(area));
create policy objetivos_actualizar on public.objetivos_mensuales for update to authenticated
  using (puede_cargar(area)) with check (puede_cargar(area));
create policy objetivos_borrar on public.objetivos_mensuales for delete to authenticated
  using (puede_cargar(area));
