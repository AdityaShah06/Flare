'use client'
import { useState } from 'react'
import { RiskBadge, RiskGauge } from '@/components'
import { riskColorHex, yearLabel, timeAgo } from '@/lib/utils'
import type { Student, RiskLevel } from '@/types'
import { Area, ComposedChart, Line, ResponsiveContainer } from 'recharts'

interface StudentCardProps {
  student: Student
  onClick: () => void
  index: number
}

export function StudentCard({ student, onClick, index }: StudentCardProps) {
  const level = student.risk_level
  const rColor = riskColorHex(level)
  const [hovered, setHovered] = useState(false)

  const sparklineData = student.risk_history.slice(-14).map(p => ({ score: p.score }))

  return (
    <div
      className="card cursor-pointer group"
      style={{
        padding: 20,
        position: 'relative',
        overflow: 'hidden',
        borderLeft: `3px solid ${rColor}`,
        animation: `fadeUp 0.45s ease-out ${index * 50}ms both`,
        ...(level === 'critical' ? { animation: `fadeUp 0.45s ease-out ${index * 50}ms both, criticalPulse 3s ease-in-out infinite` } : {}),
      }}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Gradient overlay on hover */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 'inherit',
          pointerEvents: 'none',
          zIndex: 0,
          background: hovered
            ? `radial-gradient(ellipse at 50% 50%, rgba(99,91,255,0.04) 0%, transparent 70%)`
            : 'none',
          transition: 'background 0.4s ease',
        }}
      />

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* ROW 1 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 40, height: 40, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: `${rColor}12`,
                border: `1px solid ${rColor}25`,
                color: rColor,
                fontSize: 13, fontWeight: 600,
              }}
              className="font-data"
            >
              {student.avatar_initials}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span className="font-ui hover-glow" style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer' }}>
                {student.name}
              </span>
              <span className="font-ui" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {student.major} · {yearLabel(student.year)}
              </span>
            </div>
          </div>
          <RiskBadge level={level} pulse={level === 'critical'} size="sm" />
        </div>

        {/* ROW 2 */}
        <div style={{ display: 'flex', gap: 16, marginTop: 16 }}>
          <RiskGauge score={student.risk_score} size={90} animated={true} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6 }}>
            {student.risk_flags.slice(0, 2).map((flag, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ width: 3, height: 3, marginTop: 6, flexShrink: 0, backgroundColor: rColor, borderRadius: '50%' }} />
                <span className="font-ui" style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  {flag}
                </span>
              </div>
            ))}
            {student.risk_flags.length === 0 && (
              <span className="font-ui" style={{ fontSize: 11, color: 'var(--risk-low)' }}>
                No active risk indicators
              </span>
            )}
            {student.will_cross_critical && level !== 'critical' && (
              <div style={{
                background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
                borderRadius: 8, padding: '2px 8px', width: 'max-content',
              }}>
                <span className="font-ui" style={{ fontSize: 10, color: '#F59E0B', display: 'flex', alignItems: 'center', gap: 4 }}>
                  ⚡ Critical projected in 7d
                </span>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <span className="font-ui" style={{ fontSize: 10, color: 'var(--text-muted)' }}>GPA</span>
              <span className="font-data" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{student.gpa.toFixed(1)}</span>
            </div>
          </div>
        </div>

        {/* ROW 3: Sparkline */}
        <div style={{ marginTop: 12, height: 38, width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={sparklineData}>
              <Area type="monotone" dataKey="score" fill={`${rColor}10`} stroke="none" isAnimationActive={false} />
              <Line type="monotone" dataKey="score" stroke={rColor} strokeWidth={1.5} dot={false} isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* ROW 4 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
          <div className="font-data" style={{ fontSize: 10, color: 'var(--text-muted)' }}>
            {timeAgo(student.last_updated)}
          </div>
          <div className="font-ui" style={{
            fontSize: 10, color: 'var(--accent-blue)',
            opacity: hovered ? 1 : 0, transition: 'opacity 0.2s',
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            View profile <span style={{ fontSize: 12, lineHeight: 1 }}>→</span>
          </div>
        </div>
      </div>
    </div>
  )
}
