'use client'

export default function BotonImprimir() {
  return <button type="button" className="secundario no-imprimir" onClick={() => window.print()}>Imprimir o guardar como PDF</button>
}
