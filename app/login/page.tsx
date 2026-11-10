'use client'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { supabaseBrowser } from '@/lib/supabase/client'

function Formulario() {
  const router = useRouter()
  const params = useSearchParams()
  const [email, setEmail] = useState('')
  const [clave, setClave] = useState('')
  const [error, setError] = useState(params.get('error') === 'inactivo' ? 'Tu usuario está desactivado. Consultá con el administrador.' : '')
  const [cargando, setCargando] = useState(false)

  async function ingresar(e: React.FormEvent) {
    e.preventDefault()
    setCargando(true); setError('')
    const { error } = await supabaseBrowser().auth.signInWithPassword({ email, password: clave })
    if (error) { setError('Correo o clave incorrectos.'); setCargando(false); return }
    router.push('/panel'); router.refresh()
  }

  return (
    <form onSubmit={ingresar}>
      <div className="campo">
        <label htmlFor="email">Correo</label>
        <input id="email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="campo">
        <label htmlFor="clave">Clave</label>
        <input id="clave" type="password" autoComplete="current-password" required value={clave} onChange={(e) => setClave(e.target.value)} />
      </div>
      {error && <p className="mensaje-error" role="alert">{error}</p>}
      <button type="submit" disabled={cargando} style={{ width: '100%' }}>{cargando ? 'Ingresando…' : 'Ingresar'}</button>
    </form>
  )
}

export default function Login() {
  return (
    <main className="centro">
      <div className="tarjeta">
        <div className="marca">Werchow</div>
        <Suspense><Formulario /></Suspense>
      </div>
    </main>
  )
}
