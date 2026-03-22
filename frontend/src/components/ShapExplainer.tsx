'use client'
import { useState, useEffect } from 'react'
import { Info } from 'lucide-react'
import type { ShapEntry } from '@/types'
import { formatShapValue } from '@/lib/utils'

interface ShapExplainerProps {
  explanation: ShapEntry[]
  probability: number
}

export function ShapExplainer({ explanation, probability }: ShapExplainerProps) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 50)
    return () => clearTimeout(t)
  }, [])

  if (!explanation || explanation.length === 0) {
    return (
      <div style={{ padding: 16 }}>
        <div className="font-data" style={{ fontSize: 10, letterSpacing: '0.15em', color: 'var(--text-muted)', marginBottom: 16, textTransform: 'uppercase' }}>
          RISK DRIVERS
        </div>
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="skeleton" style={{ height: 44, borderRadius: 8, marginBottom: 10 }} />
        ))}
      </div>
    )
  }

  const topEntries = explanation
  const maxAbs = Math.max(...explanation.map(e => Math.abs(e.shap)), 0.0001)

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span className="font-data" style={{ fontSize: 10, letterSpacing: '0.15em', color: 'var(--text-muted)' }}>RISK DRIVERS</span>
          <div className="group relative">
            <Info size={12} style={{ color: 'var(--text-muted)', cursor: 'help' }} />
            <div className="absolute right-0 bottom-full mb-2 w-64 p-3 rounded-lg text-xs font-ui opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)', color: 'var(--text-secondary)', boxShadow: '0 8px 32px rgba(0,0,0,0.08)' }}>
              SHAP (SHapley Additive exPlanations) values from a gradient-boosted classifier trained on 3,000 synthetic LMS behavioral records. Positive values increase risk.
            </div>
          </div>
        </div>
        <span className="font-data" style={{ fontSize: 9, color: 'var(--text-dim)', marginTop: 4 }}>Gradient Boosting · SHAP attribution · 7 features</span>
      </div>

      <div style={{ height: 1, width: '100%', background: 'var(--border-dim)', margin: '12px 0' }} />

      {/* Bars */}
      <div style={{ position: 'relative' }}>
        {/* Center axis */}
        <div style={{ position: 'absolute', left: 110, right: 70, top: 0, bottom: 0, pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: 'var(--border-soft)', zIndex: 10 }} />
        </div>

        {topEntries.map((entry, idx) => {
          const pct = Math.max((Math.abs(entry.shap) / maxAbs) * 44, 2)
          const isRisk = entry.direction === 'risk'

          return (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
              {/* Left Label */}
              <div style={{ width: 110, textAlign: 'right', paddingRight: 12, flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <span className="font-ui" style={{ fontSize: 11, color: 'var(--text-secondary)' }} title={entry.human_label}>
                  {entry.human_label}
                </span>
                <span className="font-data" style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>
                  {formatShapValue(entry.feature, entry.value)}
                </span>
              </div>

              {/* Bar Zone */}
              <div style={{ flex: 1, position: 'relative', height: 20, display: 'flex', alignItems: 'center' }}>
                {isRisk ? (
                  <div style={{
                    position: 'absolute', left: '50%', borderRadius: '0 4px 4px 0',
                    width: ready ? `${pct}%` : '0%',
                    height: 18,
                    background: 'linear-gradient(90deg, rgba(239,68,68,0.15) 0%, rgba(239,68,68,0.7) 100%)',
                    boxShadow: '4px 0 16px rgba(239,68,68,0.15)',
                    transition: 'width 800ms cubic-bezier(0.25,0.46,0.45,0.94)',
                  }} />
                ) : (
                  <div style={{
                    position: 'absolute', right: '50%', borderRadius: '4px 0 0 4px',
                    width: ready ? `${pct}%` : '0%',
                    height: 18,
                    background: 'linear-gradient(270deg, rgba(16,185,129,0.15) 0%, rgba(16,185,129,0.7) 100%)',
                    boxShadow: '-4px 0 16px rgba(16,185,129,0.15)',
                    transition: 'width 800ms cubic-bezier(0.25,0.46,0.45,0.94)',
                  }} />
                )}
              </div>

              {/* Right Value */}
              <div style={{ width: 70, paddingLeft: 12, flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                <span className="font-data" style={{ fontSize: 10, fontWeight: 500, color: isRisk ? 'var(--risk-critical)' : 'var(--risk-low)' }}>
                  {isRisk ? '+' : '-'} {Math.abs(entry.shap).toFixed(2)}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <span className="font-data" style={{ fontSize: 10, color: 'var(--text-muted)' }}>
          Model confidence: {Math.round(probability * 100)}%
        </span>
        <span className="font-data" style={{ fontSize: 9, color: 'var(--text-dim)', marginTop: 2 }}>
          AUC ~0.80 · 300 estimators · 7 features
        </span>
      </div>
    </div>
  )
}
