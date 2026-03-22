import { RiskBadge } from '@/components'
import { timeAgo, riskColorHex } from '@/lib/utils'
import type { AlertItem } from '@/types'
import { ArrowRight } from 'lucide-react'

interface AlertFeedProps {
  alerts: AlertItem[]
}

export function AlertFeed({ alerts }: AlertFeedProps) {
  if (alerts.length === 0) {
    return (
      <div style={{ padding: '48px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
        <div style={{ position: 'relative', width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            border: '1px solid rgba(16,185,129,0.3)',
            animation: 'radarPing 2s ease-out infinite',
          }} />
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            border: '1px solid rgba(16,185,129,0.15)',
            animation: 'radarPing 2s ease-out infinite 1s',
          }} />
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--risk-low)' }} />
        </div>
        <span className="font-display" style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 16 }}>System monitoring active</span>
        <span className="font-ui" style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4 }}>Live events appear here</span>
      </div>
    )
  }

  return (
    <div style={{ overflowY: 'auto', maxHeight: 500, paddingRight: 8 }}>
      {alerts.map((alert) => {
        const rColor = riskColorHex(alert.risk_level)
        const isAuto = alert.source === 'autonomous_ingestion'

        return (
          <div
            key={alert.id}
            className="animate-slide-in-left"
            style={{
              borderRadius: 12, padding: 12, marginBottom: 8,
              background: `linear-gradient(135deg, ${rColor}08, var(--bg-surface))`,
              borderLeft: `3px solid ${rColor}`,
              border: `1px solid ${rColor}15`,
              borderLeftWidth: 3,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="font-ui" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>
                {alert.student_name}
              </span>
              <RiskBadge level={alert.risk_level} size="sm" />
              <span className="font-data" style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto', flexShrink: 0 }}>
                {timeAgo(alert.timestamp)}
              </span>
            </div>

            <div className="font-ui" style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, wordBreak: 'break-word' }}>
              {alert.message}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
              <div className="font-data" style={{
                fontSize: 9, fontWeight: 500, padding: '2px 8px', borderRadius: 20,
                ...(isAuto ? {
                  background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)', color: '#7C3AED',
                } : {
                  background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.06)', color: 'var(--text-muted)',
                }),
              }}>
                {isAuto ? 'AUTO' : 'MANUAL'}
              </div>

              {alert.old_score !== undefined && alert.new_score !== undefined && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10 }} className="font-data">
                  <span style={{ color: 'var(--text-muted)' }}>{Math.round(alert.old_score)}</span>
                  <ArrowRight size={10} style={{ color: 'var(--text-muted)' }} />
                  <span style={{ color: rColor }}>{Math.round(alert.new_score)}</span>
                </div>
              )}

              {alert.will_cross_critical && alert.risk_level !== 'critical' && (
                <span className="font-data" style={{ fontSize: 9, color: 'var(--risk-medium)' }}>
                  ⚡ Critical in 7d
                </span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
