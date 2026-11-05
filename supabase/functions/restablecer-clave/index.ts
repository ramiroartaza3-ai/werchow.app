// Edge Function: un admin define una clave temporal para otro usuario (debe cambiarla al ingresar)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

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

    const { usuario_id, clave } = await req.json()
    if (typeof usuario_id !== 'string' || typeof clave !== 'string' || clave.length < 8) {
      return json({ error: 'La clave temporal debe tener 8 caracteres o más' }, 400)
    }
    const { error } = await admin.auth.admin.updateUserById(usuario_id, { password: clave })
    if (error) return json({ error: error.message }, 400)
    await admin.from('perfiles').update({ cambiar_clave: true }).eq('id', usuario_id)
    return json({ ok: true })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
