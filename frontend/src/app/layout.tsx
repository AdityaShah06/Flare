import type { Metadata } from 'next'
import './globals.css'
import { CursorGlow } from '@/components'

export const metadata: Metadata = {
  title: 'FLARE | Retention Intelligence',
  description: 'Proactive student retention early-warning system',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body style={{
        background: 'var(--bg-base)',
        color: 'var(--text-primary)',
        minHeight: '100vh',
        fontFamily: "'Inter', -apple-system, system-ui, sans-serif",
      }}>
        <CursorGlow />
        <div style={{ position: 'relative', zIndex: 10, width: '100%', minHeight: '100vh' }}>
          {children}
        </div>
      </body>
    </html>
  )
}
