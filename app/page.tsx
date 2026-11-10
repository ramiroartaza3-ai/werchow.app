import { redirect } from 'next/navigation'
import { getPerfil } from '@/lib/perfil'

export default async function Inicio() {
  const perfil = await getPerfil()
  redirect(perfil.rol === 'usuario' ? '/inicio' : '/panel')
}
