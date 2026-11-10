-- Werchow · Etapa 3: guía de gestión de Ventas, calendario de Salud y gestión de usuarios

-- Secciones de guías editables (hoy: Ventas)
create table public.guias_secciones (
  id bigint generated always as identity primary key,
  area text not null,
  orden int not null,
  titulo text not null,
  contenido text not null default '',
  enlaces jsonb not null default '[]'::jsonb,
  actualizado_en timestamptz not null default now()
);
alter table public.guias_secciones enable row level security;
create policy guias_ver on public.guias_secciones for select to authenticated
  using (es_admin() or area = any(areas_actual()));
create policy guias_admin on public.guias_secciones for all to authenticated
  using (es_admin()) with check (es_admin());

insert into public.guias_secciones (area, orden, titulo, contenido) values
('ventas', 1, 'Tipos de venta',
'- Ventas por convenios: policías y penitenciarios, educación, transporte.
- Ventas personales: rastrillaje, participación en eventos, referidos y venta en sucursal.
- Ventas telefónicas: para personas.'),
('ventas', 2, 'Qué necesita tener el vendedor',
'- Fichas o solicitudes de ingreso: se sacan de la carpeta HOME, compartida entre todos los compañeros. Ahí hay distintos formularios de incorporación según el plan y cada formulario lleva el nombre del plan.
- En la carpeta HOME también están los planes vigentes, las solicitudes de los planes, la descripción de planes y los formularios de débitos de terceros y de autorización de débito.
- También lleva las consideraciones generales y el plan de subsidio extraordinario.
- Formularios de San Miguel y de ISJ (la mutual de la empresa): ambos planes tienen la misma calidad de servicio y solo cambia el valor de la atención del servicio médico.
- Identificador con el nombre de la empresa y uniforme.
- Agenda, lapicera y celular.'),
('ventas', 3, 'Esquema de trabajo en rastrillaje',
'- Cronograma semanal y diario.
- Se definen los puntos de encuentro.
- A las 9 am, en el punto de encuentro, se divide la zona.
- Se asignan 2 asesores por manzana.'),
('ventas', 4, 'Esquema de trabajo en salón',
'- Casa central, Otero y salón por convenio en Credimás (San Salvador, Perico y San Pedro).
- Stand en Biofarma, frente al Changomás.
- En El Carmen y Perico, la vendedora cubre la sucursal de El Carmen, el Centro Médico Crecer en El Carmen y Credimás en Perico.'),
('ventas', 5, 'Esquema de trabajo en call center',
'- Se trabaja con la base de datos de clientes existentes activos.
- También se agregaron clientes con morosidad (12 meses en adelante) y reincidentes. Los reincidentes se incorporan solo con tarjeta de crédito.
- También hay altas provisorias: todos los que firmaron las fichas pero nunca llegaron a pagar la cuota.
- La base de datos está en el Drive. Cada usuario tiene su ficha de Excel con los contactos para realizar las llamadas.
- La devolución de los datos se hace en un Excel.
- Si no se logra ubicar al cliente por el número de contacto, se busca en Credixsa.');

-- Un administrador no puede quitarse a sí mismo el rol ni desactivarse (evita quedar afuera del sistema)
create or replace function public.proteger_admin() returns trigger
language plpgsql as $$
begin
  if old.id = auth.uid() and old.rol = 'admin' and (new.rol <> 'admin' or new.activo = false) then
    raise exception 'Un administrador no puede quitarse el rol ni desactivarse a sí mismo.';
  end if;
  return new;
end $$;

create trigger perfiles_proteger_admin
  before update on public.perfiles
  for each row execute function public.proteger_admin();
