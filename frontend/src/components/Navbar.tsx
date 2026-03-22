'use client'
import { useEffect, useState } from 'react'
import { LiveStatusBar } from './LiveStatusBar'

interface NavbarProps {
  wsStatus: 'connecting' | 'connected' | 'disconnected'
  studentCount: number
}

export function Navbar({ wsStatus, studentCount }: NavbarProps) {
  const [time, setTime] = useState('')

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setTime(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }))
    }
    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <nav style={{
      position: 'sticky',
      top: 0,
      zIndex: 40,
      height: 64,
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 32px',
      background: 'var(--bg-glass)',
      backdropFilter: 'blur(20px) saturate(1.2)',
      WebkitBackdropFilter: 'blur(20px) saturate(1.2)',
      borderBottom: '1px solid var(--border-dim)',
    }}>
      {/* LEFT */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Flare logo mark */}
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: 'var(--gradient-flare)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 10px rgba(212, 102, 10, 0.3)',
          }}>
            <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
              {/* Outer lotus petals */}
              <path d="M16 3C16 3 10 8 10 14C10 17 12 19 14 20C11 18 7 16 5 12C5 12 7 20 14 22C12 22 6 24 4 28C4 28 10 26 16 26C22 26 28 28 28 28C26 24 20 22 18 22C25 20 27 12 27 12C25 16 21 18 18 20C20 19 22 17 22 14C22 8 16 3 16 3Z" fill="white" fillOpacity="0.95"/>
              {/* Inner flame core */}
              <path d="M16 8C16 8 13 12 13 15.5C13 17.5 14.3 19 16 19C17.7 19 19 17.5 19 15.5C19 12 16 8 16 8Z" fill="white" fillOpacity="0.5"/>
            </svg>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span className="font-ui" style={{ fontWeight: 700, fontSize: 17, letterSpacing: '0.12em', color: 'var(--text-primary)' }}>FLARE</span>
            <span className="font-ui" style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: -2, letterSpacing: '0.05em' }}>Early Warning System</span>
          </div>
        </div>
      </div>

      {/* RIGHT */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <LiveStatusBar status={wsStatus} studentCount={studentCount} />
        <div style={{ width: 1, height: 20, background: 'var(--border-soft)' }} />
        <div className="font-data" style={{ fontSize: 12, color: 'var(--text-muted)', width: 85, textAlign: 'right' }}>
          {time}
        </div>
      </div>
    </nav>
  )
}
