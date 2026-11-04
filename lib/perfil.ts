import { cache } from 'react'
import { redirect } from 'next/navigation'
import { supabaseServer } from '@/lib/supabase/server'

export type Perfil = {
  id: string; email: string; nombre: string | null; rol: string
  areas: string[]; activo: boolean; cambiar_clave: boolean
}

export const getPerfil = cache(async (): Promise<Perfil> => {
  const supabase = supabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data } = await supabase.from('perfiles').select('*').eq('id', user.id).single()
  if (!data || !data.activo) redirect('/login?error=inactivo')
  if (data.cambiar_clave) redirect('/cambiar-clave')
  return data as Perfil
})

export const areasVisibles = (p: Perfil) =>
  p.rol === 'admin' ? ['ventas', 'sepelio', 'administracion', 'salud'] : p.areas
