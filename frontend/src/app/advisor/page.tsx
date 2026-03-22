'use client'
import React, { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useWebSocket, useStudents } from '@/hooks'
import {
  Navbar,
  StudentCard,
  AlertFeed,
  DemoInjector,
  CohortChart,
} from '@/components'
import { Search, SlidersHorizontal, Activity, Users, AlertTriangle, TrendingUp, Heart, Zap } from 'lucide-react'
import type { Student, WebSocketMessage } from '@/types'

function AnimatedNumber({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const [display, setDisplay] = React.useState(0)
  React.useEffect(() => {
    const start = performance.now()
    const duration = 1000
    const animate = (now: number) => {
      const t = Math.min((now - start) / duration, 1)
      const ease = 1 - Math.pow(1 - t, 4)
      setDisplay(value * ease)
      if (t < 1) requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
  }, [value])
  return <>{decimals > 0 ? display.toFixed(decimals) : Math.round(display)}</>
}

export default function AdvisorDashboard() {
  const router = useRouter()
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws'
  const { lastMessage, messages, connectionStatus } = useWebSocket(wsUrl)
  const { students, loading, error, refetch } = useStudents(lastMessage)

  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<'highest' | 'lowest' | 'recent'>('highest')
  const [filter, setFilter] = useState<'all' | 'critical'>('all')

  const criticalCount = students.filter((s: Student) => s.risk_level === 'critical').length
  const highCount = students.filter((s: Student) => s.risk_level === 'high').length
  const avgRisk = students.length > 0
    ? students.reduce((sum: number, s: Student) => sum + s.risk_score, 0) / students.length
    : 0
  const cohortHealth = Math.round(100 - avgRisk)

  const sortedAndFiltered = useMemo(() => {
    let result = [...students]
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(s => s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q) || s.major.toLowerCase().includes(q))
    }
    if (filter === 'critical') {
      result = result.filter(s => s.risk_level === 'critical')
    }
    result.sort((a, b) => {
      if (sort === 'highest') return b.risk_score - a.risk_score
      if (sort === 'lowest') return a.risk_score - b.risk_score
      if (sort === 'recent') return new Date(b.last_updated).getTime() - new Date(a.last_updated).getTime()
      return 0
    })
    return result
  }, [students, search, sort, filter])

  const alerts = useMemo(() => {
    return messages
      .filter((m: WebSocketMessage) => m.type === 'risk_update' && m.event_description)
      .map((m: WebSocketMessage) => ({
        id: `${m.student_id}-${m.timestamp}-${Math.random()}`,
        timestamp: m.timestamp,
        student_id: m.student_id!,
        student_name: m.student_name!,
        message: m.event_description!,
        risk_level: m.risk_level!,
        event_type: m.event_type || 'unknown',
        source: m.source || 'autonomous_ingestion' as const,
        old_score: m.old_risk_score,
        new_score: m.new_risk_score,
        will_cross_critical: m.will_cross_critical
      }))
  }, [messages])

  // Summary data
  const deteriorating = students.filter(s => s.trend === 'deteriorating').length
  const crossingCritical = students.filter(s => s.will_cross_critical && s.risk_level !== 'critical').length

  if (loading && students.length === 0) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg-base)',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            border: '2px solid var(--accent-warm)', borderTopColor: 'transparent',
            animation: 'ringRotate 0.8s linear infinite',
          }} />
          <span className="font-ui" style={{ fontSize: 13, color: 'var(--text-muted)' }}>Loading dashboard…</span>
        </div>
      </div>
    )
  }

  const statCards = [
    {
      icon: <Users size={18} />,
      iconBg: 'rgba(74,108,247,0.08)',
      iconColor: '#4A6CF7',
      value: students.length,
      label: 'Students Monitored',
      sub: `${students.filter(s => s.risk_level === 'low').length} low risk`,
      color: 'var(--text-primary)',
    },
    {
      icon: <AlertTriangle size={18} />,
      iconBg: criticalCount > 0 ? 'rgba(196,61,61,0.08)' : 'rgba(45,155,110,0.08)',
      iconColor: criticalCount > 0 ? '#C43D3D' : '#2D9B6E',
      value: criticalCount,
      label: 'Critical Risk',
      sub: 'immediate action needed',
      color: criticalCount > 0 ? '#C43D3D' : '#2D9B6E',
      pulse: criticalCount > 0,
    },
    {
      icon: <TrendingUp size={18} />,
      iconBg: 'rgba(212,102,10,0.08)',
      iconColor: '#D4660A',
      value: highCount,
      label: 'High Risk',
      sub: 'intervention recommended',
      color: '#D4660A',
    },
    {
      icon: <Heart size={18} />,
      iconBg: cohortHealth > 70 ? 'rgba(45,155,110,0.08)' : cohortHealth > 50 ? 'rgba(212,148,10,0.08)' : 'rgba(196,61,61,0.08)',
      iconColor: cohortHealth > 70 ? '#2D9B6E' : cohortHealth > 50 ? '#D4940A' : '#C43D3D',
      value: cohortHealth,
      label: 'Cohort Health',
      sub: 'retention score',
      color: cohortHealth > 70 ? '#2D9B6E' : cohortHealth > 50 ? '#D4940A' : '#C43D3D',
    },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
      <Navbar wsStatus={connectionStatus} studentCount={students.length} />

      <main style={{ maxWidth: 1600, margin: '0 auto', width: '100%', padding: '32px 32px 0', display: 'grid', gridTemplateColumns: '1fr 340px', gap: 32 }}>
        {/* LEFT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* PAGE HEADER */}
          <div style={{ marginBottom: 8 }}>
            <div className="font-data" style={{ fontSize: 11, letterSpacing: '0.16em', color: 'var(--text-dim)', marginBottom: 12, textTransform: 'uppercase' }}>
              TRUMAN STATE UNIVERSITY · ACADEMIC AFFAIRS · SPRING 2026
            </div>
            <h1 className="font-display hover-glow" style={{ fontSize: 48, fontWeight: 500, lineHeight: 1.1, color: 'var(--text-primary)', marginBottom: 12, cursor: 'default' }}>
              Retention Intelligence
            </h1>
            <p className="font-ui" style={{ fontSize: 14, color: 'var(--text-secondary)', maxWidth: 520, lineHeight: 1.6 }}>
              Real-time early warning system monitoring behavioral signals across your cohort.
            </p>
          </div>

          {/* STAT STRIP */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            {statCards.map((card, i) => (
              <div key={i} className="card" style={{
                padding: 20,
                animation: `fadeUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${i * 80}ms both`,
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: card.iconBg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: card.iconColor,
                  marginBottom: 16,
                  ...(card.pulse ? { animation: 'criticalPulse 2.5s ease-in-out infinite' } : {}),
                }}>
                  {card.icon}
                </div>
                <div className="font-display" style={{ fontSize: 44, fontWeight: 500, color: card.color, lineHeight: 1, marginBottom: 6 }}>
                  <AnimatedNumber value={card.value} />
                </div>
                <div className="font-ui" style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, fontWeight: 600, letterSpacing: '0.02em' }}>{card.label}</div>
                <div className="font-data" style={{ fontSize: 10, color: 'var(--text-dim)' }}>{card.sub}</div>
              </div>
            ))}
          </div>

          {/* SUMMARY BAR */}
          {(deteriorating > 0 || crossingCritical > 0) && (
            <div className="card animate-fade-up" style={{
              padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 20,
              borderLeft: '3px solid var(--accent-warm)',
            }}>
              <Zap size={16} style={{ color: 'var(--accent-warm)', flexShrink: 0 }} />
              <div className="font-ui" style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', gap: 20 }}>
                {deteriorating > 0 && (
                  <span><strong style={{ color: 'var(--risk-high)' }}>{deteriorating}</strong> students with deteriorating trends</span>
                )}
                {crossingCritical > 0 && (
                  <span><strong style={{ color: 'var(--risk-critical)' }}>{crossingCritical}</strong> projected to reach critical within 7 days</span>
                )}
              </div>
            </div>
          )}

          {/* SEARCH & CONTROLS */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
            <div style={{ position: 'relative', width: 320 }}>
              <Search style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={16} />
              <input
                type="text"
                placeholder="Search students, majors…"
                className="font-ui"
                style={{
                  width: '100%',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-dim)',
                  borderRadius: 12,
                  padding: '10px 16px 10px 42px',
                  fontSize: 13,
                  color: 'var(--text-primary)',
                  outline: 'none',
                  transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                  boxShadow: '0 1px 4px rgba(44,36,24,0.03)',
                }}
                value={search}
                onChange={e => setSearch(e.target.value)}
                onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent-warm)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(196,118,90,0.1)' }}
                onBlur={e => { e.currentTarget.style.borderColor = 'var(--border-dim)'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(44,36,24,0.03)' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                display: 'flex', alignItems: 'center',
                background: 'var(--bg-card)', border: '1px solid var(--border-dim)',
                borderRadius: 10, padding: 3,
              }}>
                {(['highest', 'lowest', 'recent'] as const).map(op => (
                  <button
                    key={op}
                    onClick={() => setSort(op)}
                    className="font-ui"
                    style={{
                      padding: '6px 12px', borderRadius: 7,
                      fontSize: 11, fontWeight: 500, cursor: 'pointer',
                      transition: 'all 0.2s', border: 'none',
                      ...(sort === op ? {
                        background: 'var(--bg-elevated)', color: 'var(--text-primary)',
                        boxShadow: '0 1px 3px rgba(44,36,24,0.08)',
                      } : {
                        background: 'transparent', color: 'var(--text-muted)',
                      }),
                    }}
                  >
                    {op === 'highest' ? 'Highest Risk' : op === 'lowest' ? 'Lowest Risk' : 'Recent'}
                  </button>
                ))}
              </div>

              <div style={{ width: 1, height: 24, background: 'var(--border-dim)' }} />

              <button
                onClick={() => setFilter(f => f === 'all' ? 'critical' : 'all')}
                className="font-ui"
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 12px', borderRadius: 8,
                  fontSize: 11, fontWeight: 500, cursor: 'pointer',
                  transition: 'all 0.2s',
                  ...(filter === 'critical' ? {
                    background: 'rgba(196,61,61,0.06)', border: '1px solid rgba(196,61,61,0.2)', color: '#C43D3D',
                  } : {
                    background: 'var(--bg-card)', border: '1px solid var(--border-dim)', color: 'var(--text-muted)',
                  }),
                }}
              >
                <SlidersHorizontal size={14} />
                Critical Only
              </button>
            </div>
          </div>

          {/* STUDENT CARDS GRID */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: 20,
            paddingBottom: 80,
          }}>
            {sortedAndFiltered.map((student, idx) => (
              <StudentCard
                key={student.id}
                student={student}
                index={idx}
                onClick={() => router.push(`/student/${student.id}`)}
              />
            ))}
            {sortedAndFiltered.length === 0 && (
              <div style={{
                gridColumn: '1 / -1', padding: '80px 0', textAlign: 'center',
                color: 'var(--text-muted)', fontSize: 14,
              }} className="font-ui">
                No students found matching your filters.
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <CohortChart students={students} />

          <div className="card" style={{ padding: 20, flex: 1, display: 'flex', flexDirection: 'column' }}>
            <h3 className="font-ui" style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Activity size={15} style={{ color: 'var(--accent-warm)' }} />
              Live Alert Feed
            </h3>
            <div style={{ flex: 1, position: 'relative' }}>
              <AlertFeed alerts={alerts} />
            </div>
          </div>
        </div>
      </main>

      <DemoInjector students={students} onReset={refetch} />
    </div>
  )
}
