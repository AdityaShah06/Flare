'use client'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'

export function ModelStatusPanel() {
  const [paused, setPaused] = useState(false)
  const [uptime, setUptime] = useState(0)

  useEffect(() => {
    let mounted = true
    const check = async () => {
      try {
        const res = await api.getIngestionStatus()
        if (mounted) setPaused(res.paused)
      } catch (e) {}
    }
    check()
    const t = setInterval(check, 5000)
    return () => { mounted = false; clearInterval(t) }
  }, [])

  useEffect(() => {
    const start = Date.now()
    const t = setInterval(() => {
      setUptime(Math.floor((Date.now() - start) / 1000))
    }, 1000)
    return () => clearInterval(t)
  }, [])

  const toggle = async () => {
    try {
      if (paused) {
        await api.resumeIngestion()
        setPaused(false)
      } else {
        await api.pauseIngestion()
        setPaused(true)
      }
    } catch (e) {}
  }

  const formatUptime = (s: number) => {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
  }

  return (
    <div className="card" style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: 'linear-gradient(135deg, rgba(99,91,255,0.1), rgba(124,58,237,0.1))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-blue)" strokeWidth="2.5" strokeLinecap="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M12 1v3m0 16v3M4.22 4.22l2.12 2.12m11.32 11.32l2.12 2.12M1 12h3m16 0h3M4.22 19.78l2.12-2.12M18.36 5.64l2.12-2.12"/>
          </svg>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span className="font-data" style={{ fontSize: 10, letterSpacing: '0.15em', color: 'var(--text-muted)' }}>ML MODEL</span>
          <span className="font-ui" style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 1 }}>Gradient Boosting</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 16px' }}>
        {[
          ['Algorithm', 'Gradient Boosting'],
          ['Features', '7 signals'],
          ['Training', '3,000 records'],
          ['Est. AUC', '~0.80'],
        ].map(([label, value]) => (
          <div key={label} style={{ display: 'flex', flexDirection: 'column' }}>
            <span className="font-ui" style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-dim)' }}>{label}</span>
            <span className="font-data" style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginTop: 2 }}>{value}</span>
          </div>
        ))}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span className="font-ui" style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-dim)' }}>Ingestion</span>
          <span className="font-data" style={{
            fontSize: 12, fontWeight: 500, marginTop: 2,
            color: paused ? 'var(--risk-medium)' : 'var(--risk-low)',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <div style={{ width: 4, height: 4, borderRadius: '50%', backgroundColor: paused ? 'var(--risk-medium)' : 'var(--risk-low)' }} />
            {paused ? 'PAUSED' : 'ACTIVE'}
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span className="font-ui" style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-dim)' }}>Uptime</span>
          <span className="font-data" style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginTop: 2 }}>{formatUptime(uptime)}</span>
        </div>
      </div>

      <div style={{ width: '100%', height: 1, background: 'var(--border-dim)', margin: '12px 0' }} />

      <button
        onClick={toggle}
        className="font-ui"
        style={{
          width: '100%', borderRadius: 8, padding: '8px 0',
          fontSize: 12, fontWeight: 500, cursor: 'pointer',
          transition: 'all 0.2s',
          ...(paused ? {
            background: 'rgba(245,158,11,0.06)',
            border: '1px solid rgba(245,158,11,0.2)',
            color: 'var(--risk-medium)',
          } : {
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-dim)',
            color: 'var(--text-secondary)',
          }),
        }}
      >
        {paused ? '▶ Resume Ingestion' : '⏸ Pause Ingestion'}
      </button>
    </div>
  )
}
