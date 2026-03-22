'use client'
import { useState, useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts'
import type { Student } from '@/types'
import { riskColorHex, scoreToLevel } from '@/lib/utils'
import { ChevronDown, TrendingUp, BarChart3 } from 'lucide-react'

interface CohortChartProps {
  students: Student[]
}

type ChartView = 'distribution' | 'byMajor' | 'byYear'

const RISK_COLORS = {
  low: '#2D9B6E',
  medium: '#D4940A',
  high: '#D4660A',
  critical: '#C43D3D',
}

export function CohortChart({ students }: CohortChartProps) {
  const [view, setView] = useState<ChartView>('distribution')
  const [isOpen, setIsOpen] = useState(false)

  const viewLabels: Record<ChartView, string> = {
    distribution: 'Risk Distribution',
    byMajor: 'By Major',
    byYear: 'By Year',
  }

  const distributionData = useMemo(() => {
    const dist = { Low: 0, Medium: 0, High: 0, Critical: 0 }
    students.forEach(s => {
      if (s.risk_level === 'low') dist.Low++
      else if (s.risk_level === 'medium') dist.Medium++
      else if (s.risk_level === 'high') dist.High++
      else dist.Critical++
    })
    return [
      { name: 'Low', value: dist.Low, color: RISK_COLORS.low },
      { name: 'Medium', value: dist.Medium, color: RISK_COLORS.medium },
      { name: 'High', value: dist.High, color: RISK_COLORS.high },
      { name: 'Critical', value: dist.Critical, color: RISK_COLORS.critical },
    ]
  }, [students])

  const majorData = useMemo(() => {
    const map: Record<string, { total: number; riskSum: number }> = {}
    students.forEach(s => {
      if (!map[s.major]) map[s.major] = { total: 0, riskSum: 0 }
      map[s.major].total++
      map[s.major].riskSum += s.risk_score
    })
    return Object.entries(map).map(([name, data]) => ({
      name: name.length > 12 ? name.substring(0, 12) + '…' : name,
      avgRisk: Math.round(data.riskSum / data.total),
      count: data.total,
      color: riskColorHex(scoreToLevel(data.riskSum / data.total)),
    })).sort((a, b) => b.avgRisk - a.avgRisk)
  }, [students])

  const yearData = useMemo(() => {
    const labels = ['', 'Freshman', 'Sophomore', 'Junior', 'Senior']
    const map: Record<number, { total: number; riskSum: number }> = {}
    students.forEach(s => {
      if (!map[s.year]) map[s.year] = { total: 0, riskSum: 0 }
      map[s.year].total++
      map[s.year].riskSum += s.risk_score
    })
    return Object.entries(map).map(([year, data]) => ({
      name: labels[Number(year)] || `Year ${year}`,
      avgRisk: Math.round(data.riskSum / data.total),
      count: data.total,
      color: riskColorHex(scoreToLevel(data.riskSum / data.total)),
    })).sort((a, b) => a.name.localeCompare(b.name))
  }, [students])

  const avgRisk = students.length > 0
    ? Math.round(students.reduce((s, st) => s + st.risk_score, 0) / students.length)
    : 0

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.[0]) return null
    const d = payload[0].payload
    return (
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border-soft)',
        borderRadius: 10, padding: '8px 12px', boxShadow: '0 8px 32px rgba(44,36,24,0.12)',
      }}>
        <div className="font-ui" style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{d.name}</div>
        <div className="font-data" style={{ fontSize: 11, color: d.color, marginTop: 2 }}>
          {d.avgRisk !== undefined ? `Avg Risk: ${d.avgRisk}` : `Count: ${d.value}`}
          {d.count !== undefined && <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>{d.count} students</span>}
        </div>
      </div>
    )
  }

  return (
    <div className="card" style={{ padding: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <BarChart3 size={15} style={{ color: 'var(--accent-warm)' }} />
          <span className="font-ui" style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>
            Cohort Analytics
          </span>
        </div>

        {/* Dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="font-ui"
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '4px 10px', borderRadius: 8,
              fontSize: 11, fontWeight: 500, cursor: 'pointer',
              background: 'var(--bg-elevated)', border: '1px solid var(--border-dim)',
              color: 'var(--text-secondary)', transition: 'all 0.2s',
            }}
          >
            {viewLabels[view]}
            <ChevronDown size={12} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>
          {isOpen && (
            <div className="animate-slide-up" style={{
              position: 'absolute', top: '100%', right: 0, marginTop: 4,
              background: 'var(--bg-card)', border: '1px solid var(--border-soft)',
              borderRadius: 10, overflow: 'hidden', boxShadow: '0 8px 32px rgba(44,36,24,0.12)',
              zIndex: 20, minWidth: 140,
            }}>
              {(['distribution', 'byMajor', 'byYear'] as ChartView[]).map(v => (
                <button key={v} onClick={() => { setView(v); setIsOpen(false) }}
                  className="font-ui"
                  style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    padding: '8px 14px', fontSize: 11, fontWeight: 500,
                    cursor: 'pointer', border: 'none', transition: 'all 0.15s',
                    background: v === view ? 'var(--bg-elevated)' : 'transparent',
                    color: v === view ? 'var(--text-primary)' : 'var(--text-secondary)',
                  }}
                >
                  {viewLabels[v]}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Avg risk badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <TrendingUp size={12} style={{ color: riskColorHex(scoreToLevel(avgRisk)) }} />
        <span className="font-data" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
          Cohort avg: <span style={{ color: riskColorHex(scoreToLevel(avgRisk)), fontWeight: 600 }}>{avgRisk}</span>
        </span>
      </div>

      {/* Charts */}
      <div style={{ height: 180 }}>
        {view === 'distribution' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, height: '100%' }}>
            <div style={{ width: 120, height: 120, flexShrink: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={distributionData} dataKey="value" cx="50%" cy="50%"
                    innerRadius={30} outerRadius={52} paddingAngle={3} strokeWidth={0}>
                    {distributionData.map((d, i) => (
                      <Cell key={i} fill={d.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {distributionData.map(d => (
                <div key={d.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 3, background: d.color }} />
                    <span className="font-ui" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{d.name}</span>
                  </div>
                  <span className="font-data" style={{ fontSize: 12, fontWeight: 600, color: d.color }}>{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={view === 'byMajor' ? majorData : yearData} layout="vertical" barSize={14}
              margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 9, fill: 'var(--text-dim)' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(160,140,110,0.06)' }} />
              <Bar dataKey="avgRisk" radius={[0, 6, 6, 0]}>
                {(view === 'byMajor' ? majorData : yearData).map((d, i) => (
                  <Cell key={i} fill={d.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
