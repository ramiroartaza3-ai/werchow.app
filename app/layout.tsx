import type { Metadata } from 'next'
import { Public_Sans } from 'next/font/google'
import './globals.css'

const fuente = Public_Sans({ subsets: ['latin'] })

export const metadata: Metadata = { title: 'Werchow · Gestión', description: 'Sistema interno de gestión Werchow' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={fuente.className}>{children}</body>
    </html>
  )
}
