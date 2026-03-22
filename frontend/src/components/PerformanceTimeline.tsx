'use client'
import { useState, useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Area, ComposedChart, ReferenceLine
} from 'recharts'
import type { Student } from '@/types'
import { Calendar, TrendingUp, BarChart3 } from 'lucide-react'

interface PerformanceTimelineProps {
  student: Student
}

type TimeRange = 'weekly' | 'monthly' | 'semester'

// Generate realistic semester-long weekly data from student's current state
function generateSemesterData(student: Student) {
  const weeks = 14 // typical semester
  const currentWeek = 10 // we're ~10 weeks in
  let seed = student.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646 }

  const startGpa = student.gpa + (rand() * 0.4 - 0.1) // start slightly higher for declining students
  const endGpa = student.gpa
  const riskStart = Math.max(0, student.risk_score - 20 - rand() * 15)
  const riskEnd = student.risk_score

  const weeklyData = []
  const semesterStart = new Date('2026-01-12') // Spring 2026 start

  for (let w = 1; w <= currentWeek; w++) {
    const t = w / currentWeek
    const weekDate = new Date(semesterStart)
    weekDate.setDate(weekDate.getDate() + (w - 1) * 7)

    // GPA with slight noise
    let gpa = startGpa + (endGpa - startGpa) * t + (rand() * 0.15 - 0.075)
    gpa = Math.max(0, Math.min(4.0, parseFloat(gpa.toFixed(2))))

    // Risk score with noise
    let risk = riskStart + (riskEnd - riskStart) * t + (rand() * 6 - 3)
    risk = Math.max(0, Math.min(100, Math.round(risk)))

    // Assignments submitted that week
    const totalAssignments = Math.floor(2 + rand() * 3)
    const completedAssignments = student.risk_level === 'critical'
      ? Math.max(0, totalAssignments - Math.floor(rand() * 3))
      : student.risk_level === 'high'
        ? totalAssignments - Math.floor(rand() * 2)
        : totalAssignments

    // Avg grade that week
    let avgGrade = student.courses.reduce((s, c) => s + c.current_grade, 0) / student.courses.length
    avgGrade += (rand() * 10 - 5) + (startGpa - endGpa) * 20 * (1 - t) // declining students had better early grades
    avgGrade = Math.max(30, Math.min(100, Math.round(avgGrade * 10) / 10))

    // Engagement hours (LMS time)
    const baseHours = student.risk_level === 'low' ? 18 : student.risk_level === 'medium' ? 14 : student.risk_level === 'high' ? 10 : 6
    const engagementHours = Math.max(1, Math.round((baseHours + (rand() * 8 - 4) - (student.risk_score / 100) * 4 * t) * 10) / 10)

    weeklyData.push({
      week: w,
      label: `W${w}`,
      date: weekDate.toISOString().split('T')[0],
      dateLabel: weekDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      gpa,
      riskScore: risk,
      avgGrade,
      completionRate: totalAssignments > 0 ? Math.round((completedAssignments / totalAssignments) * 100) : 100,
      engagementHours,
      assignmentsCompleted: completedAssignments,
      assignmentsTotal: totalAssignments,
    })
  }
  return weeklyData
}

function generateMonthlyData(weeklyData: ReturnType<typeof generateSemesterData>) {
  const months: Record<string, typeof weeklyData> = {}
  weeklyData.forEach(w => {
    const monthKey = w.date.substring(0, 7) // YYYY-MM
    if (!months[monthKey]) months[monthKey] = []
    months[monthKey].push(w)
  })
  return Object.entries(months).map(([month, weeks]) => {
    const d = new Date(month + '-01')
    return {
      label: d.toLocaleDateString('en-US', { month: 'short' }),
      dateLabel: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      gpa: parseFloat((weeks.reduce((s, w) => s + w.gpa, 0) / weeks.length).toFixed(2)),
      riskScore: Math.round(weeks.reduce((s, w) => s + w.riskScore, 0) / weeks.length),
      avgGrade: Math.round(weeks.reduce((s, w) => s + w.avgGrade, 0) / weeks.length * 10) / 10,
      completionRate: Math.round(weeks.reduce((s, w) => s + w.completionRate, 0) / weeks.length),
      engagementHours: Math.round(weeks.reduce((s, w) => s + w.engagementHours, 0) * 10) / 10,
      assignmentsCompleted: weeks.reduce((s, w) => s + w.assignmentsCompleted, 0),
      assignmentsTotal: weeks.reduce((s, w) => s + w.assignmentsTotal, 0),
    }
  })
}

const METRICS = [
  { key: 'gpa', label: 'GPA', color: '#4A6CF7', domain: [0, 4], formatter: (v: number) => v.toFixed(2) },
  { key: 'riskScore', label: 'Risk Score', color: '#C43D3D', domain: [0, 100], formatter: (v: number) => `${v}` },
  { key: 'avgGrade', label: 'Avg Grade', color: '#2D9B6E', domain: [0, 100], formatter: (v: number) => `${v}%` },
  { key: 'completionRate', label: 'Completion Rate', color: '#D4940A', domain: [0, 100], formatter: (v: number) => `${v}%` },
  { key: 'engagementHours', label: 'LMS Hours', color: '#7C3AED', domain: [0, 30], formatter: (v: number) => `${v}h` },
] as const

export function PerformanceTimeline({ student }: PerformanceTimelineProps) {
  const [range, setRange] = useState<TimeRange>('weekly')
  const [metric, setMetric] = useState<typeof METRICS[number]>(METRICS[0])

  const weeklyData = useMemo(() => generateSemesterData(student), [student.id, student.risk_score])
  const monthlyData = useMemo(() => generateMonthlyData(weeklyData), [weeklyData])

  const data = range === 'weekly' ? weeklyData
    : range === 'monthly' ? monthlyData
      : weeklyData // semester = all weekly data shown

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.[0]) return null
    const d = payload[0].payload
    return (
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border-soft)',
        borderRadius: 10, padding: '10px 14px', boxShadow: '0 8px 32px rgba(44,36,24,0.12)',
        minWidth: 160,
      }}>
        <div className="font-ui" style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
          {d.dateLabel || d.label}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <div className="font-data" style={{ fontSize: 10, display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <span style={{ color: 'var(--text-muted)' }}>GPA</span>
            <span style={{ color: '#4A6CF7' }}>{d.gpa?.toFixed(2)}</span>
          </div>
          <div className="font-data" style={{ fontSize: 10, display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <span style={{ color: 'var(--text-muted)' }}>Risk</span>
            <span style={{ color: '#C43D3D' }}>{d.riskScore}</span>
          </div>
          <div className="font-data" style={{ fontSize: 10, display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <span style={{ color: 'var(--text-muted)' }}>Avg Grade</span>
            <span style={{ color: '#2D9B6E' }}>{d.avgGrade}%</span>
          </div>
          <div className="font-data" style={{ fontSize: 10, display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <span style={{ color: 'var(--text-muted)' }}>Completion</span>
            <span style={{ color: '#D4940A' }}>{d.completionRate}%</span>
          </div>
          {d.engagementHours != null && (
            <div className="font-data" style={{ fontSize: 10, display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <span style={{ color: 'var(--text-muted)' }}>LMS Hours</span>
              <span style={{ color: '#7C3AED' }}>{d.engagementHours}h</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Summary stats
  const latestWeek = weeklyData[weeklyData.length - 1]
  const firstWeek = weeklyData[0]
  const gpaDelta = latestWeek ? +(latestWeek.gpa - firstWeek.gpa).toFixed(2) : 0
  const riskDelta = latestWeek ? latestWeek.riskScore - firstWeek.riskScore : 0

  return (
    <div className="card" style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h3 className="font-ui" style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 4 }}>
            <TrendingUp size={13} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle', color: 'var(--accent-warm)' }} />
            Semester Performance
          </h3>
          <p className="font-ui" style={{ fontSize: 11, color: 'var(--text-dim)' }}>
            Spring 2026 · Week {weeklyData.length} of 14
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          {/* Time range toggle */}
          <div style={{
            display: 'flex', background: 'var(--bg-elevated)', border: '1px solid var(--border-dim)',
            borderRadius: 8, padding: 2,
          }}>
            {(['weekly', 'monthly', 'semester'] as TimeRange[]).map(r => (
              <button key={r} onClick={() => setRange(r)} className="font-ui"
                style={{
                  padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 500,
                  cursor: 'pointer', border: 'none', transition: 'all 0.2s',
                  ...(range === r ? {
                    background: 'var(--bg-card)', color: 'var(--text-primary)',
                    boxShadow: '0 1px 3px rgba(44,36,24,0.08)',
                  } : { background: 'transparent', color: 'var(--text-muted)' }),
                }}>
                {r === 'weekly' ? 'Week' : r === 'monthly' ? 'Month' : 'Semester'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Metric selector pills */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {METRICS.map(m => (
          <button key={m.key} onClick={() => setMetric(m)} className="font-data"
            style={{
              padding: '3px 10px', borderRadius: 20, fontSize: 10, fontWeight: 500,
              cursor: 'pointer', transition: 'all 0.2s',
              ...(metric.key === m.key ? {
                background: m.color + '15', border: `1px solid ${m.color}40`, color: m.color,
              } : {
                background: 'transparent', border: '1px solid var(--border-dim)', color: 'var(--text-muted)',
              }),
            }}>
            {m.label}
          </button>
        ))}
      </div>

      {/* Summary row */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="font-data" style={{ fontSize: 10, color: 'var(--text-dim)' }}>GPA Δ</span>
          <span className="font-data" style={{
            fontSize: 11, fontWeight: 600,
            color: gpaDelta >= 0 ? '#2D9B6E' : '#C43D3D',
          }}>
            {gpaDelta >= 0 ? '+' : ''}{gpaDelta}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="font-data" style={{ fontSize: 10, color: 'var(--text-dim)' }}>Risk Δ</span>
          <span className="font-data" style={{
            fontSize: 11, fontWeight: 600,
            color: riskDelta <= 0 ? '#2D9B6E' : '#C43D3D',
          }}>
            {riskDelta >= 0 ? '+' : ''}{riskDelta}
          </span>
        </div>
      </div>

      {/* Chart */}
      <div style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 5, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-dim)" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--text-dim)' }} axisLine={false} tickLine={false} />
            <YAxis domain={metric.domain as [number, number]} tick={{ fontSize: 9, fill: 'var(--text-dim)' }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            {metric.key === 'riskScore' && <ReferenceLine y={75} stroke="#C43D3D" strokeDasharray="4 4" opacity={0.4} />}
            <Area type="monotone" dataKey={metric.key} fill={metric.color + '10'} stroke="none" />
            <Line type="monotone" dataKey={metric.key} stroke={metric.color} strokeWidth={2}
              dot={{ fill: metric.color, r: 3, strokeWidth: 0 }}
              activeDot={{ fill: metric.color, r: 5, strokeWidth: 2, stroke: 'var(--bg-card)' }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
