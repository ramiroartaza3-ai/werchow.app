# Werchow · Sistema de gestión (Etapa 1)

Login con roles, panel de objetivos y carga mensual de objetivos para Ventas, Sepelio y Salud.
Stack: Next.js 14 + Supabase (Auth, Postgres con RLS, Edge Functions) + Vercel.

## Puesta en marcha

1. **Supabase**: creá un proyecto nuevo en supabase.com.
2. **Cerrá el registro público**: Authentication → Sign In / Providers → desactivá "Allow new users to sign up". Solo el administrador crea usuarios.
3. **Base de datos**: SQL Editor → pegá y ejecutá `supabase/migrations/001_base.sql`.
4. **Primer administrador**: Authentication → Users → Add user → correo `ramiroartaza3@gmail.com`, una clave NUEVA y fuerte (que no esté escrita en ningún chat ni archivo), tildá "Auto Confirm User". Después, en el SQL Editor:
   ```sql
   update public.perfiles
   set rol = 'admin', nombre = 'Ramiro Artaza',
       areas = '{ventas,sepelio,administracion,salud}'
   where email = 'ramiroartaza3@gmail.com';
   ```
5. **Edge Function** (creación de usuarios): con la CLI de Supabase,
   `supabase login`, `supabase link --project-ref TU_REF` y `supabase functions deploy crear-usuario`.
   (También podés pegar el contenido de `supabase/functions/crear-usuario/index.ts` en Edge Functions → Create function.)
6. **Variables**: copiá `.env.example` a `.env.local` y completá URL y anon key (Project Settings → API).
7. **Local**: `npm install` y `npm run dev` → http://localhost:3000
8. **Publicar**: subí el repo a GitHub (privado), importalo en Vercel y cargá las mismas dos variables de entorno.

## Seguridad

- La `service_role` key nunca va en Next.js ni en GitHub; solo la usa la Edge Function dentro de Supabase.
- Los permisos reales están en las políticas RLS de la base (`001_base.sql`), no en la pantalla.
- Los usuarios nuevos entran con clave temporal y deben cambiarla en el primer ingreso.

## Roles

| Rol | Ve | Carga objetivos |
|---|---|---|
| admin | todas las áreas | todas + crea usuarios |
| responsable_ventas / sepelio / salud | sus áreas asignadas | su área |
| rrhh | sus áreas asignadas | Administración |
| usuario | sus áreas asignadas | no |

## Agregar o modificar indicadores

Se editan en `lib/indicadores.ts`; no hace falta tocar la base.

## Próximas etapas

2. Sepelio: flujograma editable con enlaces + calendarios semanales de turnos y guardias
3. Ventas (guía de gestión) y Salud (calendario de horarios)
4. Administración / RR.HH. (legajos, plan de carrera, políticas, búsquedas, rendimiento, inducción, memos, minutas)
5. Agentes virtuales (ventas, fidelización, uso interno)
