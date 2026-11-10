-- Werchow · Etapa 2: procedimiento editable de Sepelio y calendarios de turnos/guardias

create table public.pasos_procedimiento (
  id bigint generated always as identity primary key,
  area text not null default 'sepelio',
  orden int not null,
  titulo text not null,
  descripcion text not null default '',
  tipo text not null default 'paso' check (tipo in ('paso','decision')),
  si_texto text,
  no_texto text,
  enlaces jsonb not null default '[]'::jsonb,
  actualizado_en timestamptz not null default now()
);
alter table public.pasos_procedimiento enable row level security;
create policy pasos_ver on public.pasos_procedimiento for select to authenticated
  using (es_admin() or area = any(areas_actual()));
create policy pasos_admin on public.pasos_procedimiento for all to authenticated
  using (es_admin()) with check (es_admin());

create table public.asignaciones (
  id bigint generated always as identity primary key,
  area text not null check (area in ('ventas','sepelio','salud','administracion')),
  tipo text not null check (tipo in ('turno','guardia','horario')),
  fecha date not null,
  persona text not null,
  hora_desde time not null,
  hora_hasta time not null,
  es_cambio boolean not null default false,
  observaciones text,
  creado_por uuid references public.perfiles(id),
  modificado_por uuid references public.perfiles(id),
  actualizado_en timestamptz not null default now()
);
create index asignaciones_busqueda on public.asignaciones (area, tipo, fecha);
alter table public.asignaciones enable row level security;
create policy asig_ver on public.asignaciones for select to authenticated
  using (es_admin() or area = any(areas_actual()));
create policy asig_insertar on public.asignaciones for insert to authenticated
  with check (puede_cargar(area));
create policy asig_actualizar on public.asignaciones for update to authenticated
  using (puede_cargar(area)) with check (puede_cargar(area));
create policy asig_borrar on public.asignaciones for delete to authenticated
  using (puede_cargar(area));

-- Registro de cambios de los calendarios
create table public.asignaciones_historial (
  id bigint generated always as identity primary key,
  asignacion_id bigint,
  area text, tipo text,
  accion text,
  datos jsonb,
  usuario uuid,
  en timestamptz not null default now()
);
alter table public.asignaciones_historial enable row level security;
create policy hist_ver on public.asignaciones_historial for select to authenticated
  using (es_admin() or area = any(areas_actual()));

create or replace function public.log_asignacion() returns trigger
language plpgsql security definer set search_path = public as $$
declare r public.asignaciones;
begin
  if tg_op = 'DELETE' then r := old; else r := new; end if;
  insert into asignaciones_historial (asignacion_id, area, tipo, accion, datos, usuario)
  values (r.id, r.area, r.tipo, lower(tg_op), to_jsonb(r), auth.uid());
  return r;
end $$;

create trigger asignaciones_log
  after insert or update or delete on public.asignaciones
  for each row execute function public.log_asignacion();

-- Pasos iniciales según el documento "SERVICIO ADMINISTRATIVO WERCHOW"
insert into public.pasos_procedimiento (orden, titulo, descripcion, tipo, si_texto, no_texto) values
(1, 'Solicitud del servicio',
 'Al recibir la solicitud, identificá la modalidad: Afiliado (distintos planes de afiliación), Particular (afiliado sin vigencia o persona no afiliada), Convenio (FADESDFYA y aseguradoras: Grupo Jardín del Pilar, Aseguradora Surco y Sol Naciente) o C.E.C.', 'paso', null, null),
(2, 'Recepción presencial',
 'La solicitud puede recibirse en la Oficina de Guardia o en la Oficina de Sucursal.', 'paso', null, null),
(3, 'Control del estado del cliente en el sistema',
 'Ingresá al sistema SGI de Werchow con tu clave de operador. En el apartado SOCIO abrí la ficha del cliente con el número de DNI y verificá su estado.', 'paso', null, null),
(4, 'Recepción no presencial',
 'Local: invitá al familiar o responsable a concurrir a la oficina con la documentación; pedile el número de afiliado e indicale qué documentación debe acercar. Interior: fuera del horario de atención, recibí la solicitud por WhatsApp, pedí imágenes de la documentación y coordiná después la instalación del servicio.', 'paso', null, null),
(5, '¿La persona fallecida tiene vigencia cumplida y cuotas al día?',
 'Comprobá que la vigencia esté cumplida y que las cuotas estén abonadas en tiempo y forma.', 'decision',
 'Continuar con la solicitud de documentación (paso 6).',
 'Informar el estado actual y los montos extras a abonar según su situación (paso 7).'),
(6, 'Solicitud de documentación obligatoria',
 'Pedí el certificado médico de defunción y el DNI de la persona fallecida.', 'paso', null, null),
(7, 'Información sobre extras o importes a abonar',
 'Según la situación administrativa del cliente, informá a los familiares los importes adicionales que correspondan. En un servicio particular, explicá las condiciones y entregá el presupuesto.', 'paso', null, null),
(8, '¿La documentación cumple los requisitos?',
 'Verificá que el certificado médico esté bien confeccionado, con los datos completos del fallecido y las firmas y sellos correspondientes, y que el DNI sea válido y esté en condiciones de presentarse.', 'decision',
 'Verificar el tipo de servicio según el plan (paso 10).',
 'Informar la documentación faltante o con errores (paso 9).'),
(9, 'Información sobre documentación faltante o con errores',
 'Informá al familiar responsable las observaciones y los pasos a seguir. Si el certificado médico tiene errores, hay que pedir la corrección al profesional que lo confeccionó.', 'paso', null, null),
(10, 'Verificación del tipo de servicio según el plan',
 'Comprobá las prestaciones del plan contratado: sepelio; sepelio y parcela; sepelio y cremación; o servicio con opción a ocupar parcela o acceder a cremación.', 'paso', null, null),
(11, 'Firma de conformidad y programación del servicio',
 'Con los requisitos verificados, pedí la firma de conformidad para el retiro del fallecido, completá el formulario SOLICITUD DE SERVICIO y registrá la información en el sistema.', 'paso', null, null),
(12, 'Verificación de disponibilidad y coordinación de horarios',
 'Enviá toda la información al encargado correspondiente para coordinar: horario de instalación de la sala velatoria, horario de inicio del velatorio, personal asignado a la sala y demás aspectos operativos.', 'paso', null, null),
(13, 'Solicitud de cambios y disponibilidad',
 'Verificá si los familiares piden modificaciones y si hay disponibilidad para hacerlas. Coordiná los detalles para finalizar el servicio: conducción, trámites correspondientes y pago de impuestos y tasas.', 'paso', null, null),
(14, '¿El servicio se realizó conforme?',
 'Una vez finalizado el servicio, enviá una encuesta de satisfacción a los contactos registrados para conocer la experiencia de los familiares.', 'decision',
 'Cerrar la gestión (paso 15).',
 'Volver al paso 13 para verificar los cambios solicitados y la disponibilidad.'),
(15, 'Cierre de gestión y análisis de encuestas',
 'Da por finalizada la gestión administrativa con el envío y seguimiento de las encuestas. Después analizá las respuestas para evaluar la calidad del servicio, detectar oportunidades de mejora y fortalecer la atención.', 'paso', null, null);
