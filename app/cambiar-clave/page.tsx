'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase/client'

export default function CambiarClave() {
  const router = useRouter()
  const [clave, setClave] = useState('')
  const [repetir, setRepetir] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    if (clave.length < 8) return setError('La clave debe tener 8 caracteres o más.')
    if (clave !== repetir) return setError('Las claves no coinciden.')
    setCargando(true); setError('')
    const supabase = supabaseBrowser()
    const { error: e1 } = await supabase.auth.updateUser({ password: clave })
    if (e1) { setError(e1.message); setCargando(false); return }
    await supabase.rpc('marcar_clave_cambiada')
    router.push('/panel'); router.refresh()
  }

  return (
    <main className="centro">
      <form className="tarjeta" onSubmit={guardar}>
        <div className="marca">Elegí tu clave</div>
        <p className="suave">Ingresaste con una clave temporal. Definí una nueva para continuar.</p>
        <div className="campo"><label htmlFor="n">Clave nueva</label>
          <input id="n" type="password" autoComplete="new-password" required value={clave} onChange={(e) => setClave(e.target.value)} /></div>
        <div className="campo"><label htmlFor="r">Repetir clave</label>
          <input id="r" type="password" autoComplete="new-password" required value={repetir} onChange={(e) => setRepetir(e.target.value)} /></div>
        {error && <p className="mensaje-error" role="alert">{error}</p>}
        <button type="submit" disabled={cargando} style={{ width: '100%' }}>{cargando ? 'Guardando…' : 'Guardar clave'}</button>
      </form>
    </main>
  )
}
