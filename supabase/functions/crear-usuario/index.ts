// Edge Function: solo un admin puede crear usuarios, y el correo debe terminar en @werchow.com
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const ROLES = ['admin', 'responsable_ventas', 'responsable_sepelio', 'responsable_salud', 'rrhh', 'usuario']
const AREAS = ['ventas', 'sepelio', 'salud', 'administracion']

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const url = Deno.env.get('SUPABASE_URL')!
    const caller = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    })
    const { data: { user } } = await caller.auth.getUser()
    if (!user) return json({ error: 'No autenticado' }, 401)

    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data: quien } = await admin.from('perfiles').select('rol, activo').eq('id', user.id).single()
    if (quien?.rol !== 'admin' || !quien.activo) return json({ error: 'Sin permiso' }, 403)

    const { usuario, nombre, rol, areas, clave } = await req.json()
    if (!/^[a-z0-9._-]{2,40}$/i.test(usuario ?? '')) return json({ error: 'Nombre de usuario inválido' }, 400)
    if (!ROLES.includes(rol)) return json({ error: 'Rol inválido' }, 400)
    if (!Array.isArray(areas) || areas.some((a: string) => !AREAS.includes(a))) return json({ error: 'Áreas inválidas' }, 400)
    if (typeof clave !== 'string' || clave.length < 8) return json({ error: 'La clave temporal debe tener 8 caracteres o más' }, 400)

    const email = `${String(usuario).toLowerCase()}@werchow.com`
    const { error } = await admin.auth.admin.createUser({
      email, password: clave, email_confirm: true,
      user_metadata: { nombre, rol, areas, cambiar_clave: true },
    })
    if (error) return json({ error: error.message }, 400)
    return json({ ok: true, email })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
