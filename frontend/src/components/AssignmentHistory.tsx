'use client'
import { useState, useMemo } from 'react'
import type { Student, Course } from '@/types'
import { format, parseISO } from 'date-fns'
import { CheckCircle2, XOctagon, Clock, AlertCircle, Filter, ChevronDown, FileText } from 'lucide-react'

interface AssignmentHistoryProps {
  student: Student
}

type StatusFilter = 'all' | 'completed' | 'overdue' | 'upcoming'

export function AssignmentHistory({ student }: AssignmentHistoryProps) {
  const [courseFilter, setCourseFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [showCourseDropdown, setShowCourseDropdown] = useState(false)

  const allAssignments = useMemo(() => {
    const now = new Date()
    const items: {
      id: string; title: string; courseName: string; courseCode: string; courseId: string;
      dueDate: string; submitted: boolean; grade: number | null; pointsPossible: number;
      status: 'completed' | 'overdue' | 'due_soon' | 'upcoming';
      daysUntilDue: number; percentage: number | null;
    }[] = []

    for (const course of student.courses) {
      for (const a of course.assignments) {
        const due = new Date(a.due_date)
        const daysUntil = (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        let status: 'completed' | 'overdue' | 'due_soon' | 'upcoming' = 'upcoming'
        if (a.submitted) status = 'completed'
        else if (daysUntil < 0) status = 'overdue'
        else if (daysUntil <= 3) status = 'due_soon'

        items.push({
          id: a.id, title: a.title, courseName: course.name, courseCode: course.code,
          courseId: course.id, dueDate: a.due_date, submitted: a.submitted,
          grade: a.grade, pointsPossible: a.points_possible,
          status, daysUntilDue: daysUntil,
          percentage: a.grade != null ? Math.round((a.grade / a.points_possible) * 100) : null,
        })
      }
    }
    items.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    return items
  }, [student])

  const filtered = useMemo(() => {
    let items = allAssignments
    if (courseFilter !== 'all') items = items.filter(a => a.courseId === courseFilter)
    if (statusFilter !== 'all') {
      if (statusFilter === 'upcoming') items = items.filter(a => a.status === 'upcoming' || a.status === 'due_soon')
      else items = items.filter(a => a.status === statusFilter)
    }
    return items
  }, [allAssignments, courseFilter, statusFilter])

  // Stats
  const completedCount = allAssignments.filter(a => a.status === 'completed').length
  const overdueCount = allAssignments.filter(a => a.status === 'overdue').length
  const avgGrade = (() => {
    const graded = allAssignments.filter(a => a.percentage != null)
    if (graded.length === 0) return null
    return Math.round(graded.reduce((s, a) => s + a.percentage!, 0) / graded.length)
  })()

  const statusIcon = (status: string) => {
    if (status === 'completed') return <CheckCircle2 size={13} style={{ color: 'var(--risk-low)', flexShrink: 0 }} />
    if (status === 'overdue') return <XOctagon size={13} style={{ color: 'var(--risk-critical)', flexShrink: 0 }} />
    if (status === 'due_soon') return <AlertCircle size={13} style={{ color: 'var(--risk-medium)', flexShrink: 0 }} />
    return <Clock size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
  }

  const gradeColor = (pct: number | null) => {
    if (pct == null) return 'var(--text-dim)'
    if (pct >= 90) return '#2D9B6E'
    if (pct >= 80) return '#4A6CF7'
    if (pct >= 70) return '#D4940A'
    if (pct >= 60) return '#D4660A'
    return '#C43D3D'
  }

  return (
    <div className="card" style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h3 className="font-ui" style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
          <FileText size={13} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle', color: 'var(--accent-warm)' }} />
          Assignment Record
        </h3>

        <div style={{ display: 'flex', gap: 8 }}>
          {/* Course filter dropdown */}
          <div style={{ position: 'relative' }}>
            <button onClick={() => setShowCourseDropdown(!showCourseDropdown)} className="font-ui"
              style={{
                display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 8,
                fontSize: 10, fontWeight: 500, cursor: 'pointer',
                background: 'var(--bg-elevated)', border: '1px solid var(--border-dim)', color: 'var(--text-secondary)',
              }}>
              {courseFilter === 'all' ? 'All Courses' : student.courses.find(c => c.id === courseFilter)?.code || 'Course'}
              <ChevronDown size={10} style={{ transform: showCourseDropdown ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>
            {showCourseDropdown && (
              <div className="animate-slide-up" style={{
                position: 'absolute', top: '100%', right: 0, marginTop: 4, zIndex: 20,
                background: 'var(--bg-card)', border: '1px solid var(--border-soft)',
                borderRadius: 10, overflow: 'hidden', boxShadow: '0 8px 32px rgba(44,36,24,0.12)',
                minWidth: 140,
              }}>
                <button onClick={() => { setCourseFilter('all'); setShowCourseDropdown(false) }} className="font-ui"
                  style={{
                    display: 'block', width: '100%', textAlign: 'left', padding: '7px 14px', fontSize: 10,
                    fontWeight: 500, cursor: 'pointer', border: 'none',
                    background: courseFilter === 'all' ? 'var(--bg-elevated)' : 'transparent',
                    color: courseFilter === 'all' ? 'var(--text-primary)' : 'var(--text-secondary)',
                  }}>All Courses</button>
                {student.courses.map(c => (
                  <button key={c.id} onClick={() => { setCourseFilter(c.id); setShowCourseDropdown(false) }} className="font-ui"
                    style={{
                      display: 'block', width: '100%', textAlign: 'left', padding: '7px 14px', fontSize: 10,
                      fontWeight: 500, cursor: 'pointer', border: 'none',
                      background: courseFilter === c.id ? 'var(--bg-elevated)' : 'transparent',
                      color: courseFilter === c.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                    }}>{c.code}</button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <CheckCircle2 size={11} style={{ color: 'var(--risk-low)' }} />
          <span className="font-data" style={{ fontSize: 10, color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--text-primary)' }}>{completedCount}</strong> completed
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <XOctagon size={11} style={{ color: 'var(--risk-critical)' }} />
          <span className="font-data" style={{ fontSize: 10, color: 'var(--text-secondary)' }}>
            <strong style={{ color: overdueCount > 0 ? 'var(--risk-critical)' : 'var(--text-primary)' }}>{overdueCount}</strong> missing
          </span>
        </div>
        {avgGrade != null && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span className="font-data" style={{ fontSize: 10, color: 'var(--text-muted)' }}>Avg:</span>
            <span className="font-data" style={{ fontSize: 11, fontWeight: 600, color: gradeColor(avgGrade) }}>{avgGrade}%</span>
          </div>
        )}
      </div>

      {/* Status filter */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
        {(['all', 'completed', 'overdue', 'upcoming'] as StatusFilter[]).map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} className="font-ui"
            style={{
              padding: '3px 10px', borderRadius: 6, fontSize: 10, fontWeight: 500,
              cursor: 'pointer', transition: 'all 0.15s', border: 'none',
              ...(statusFilter === s ? {
                background: 'var(--bg-elevated)', color: 'var(--text-primary)',
              } : { background: 'transparent', color: 'var(--text-muted)' }),
            }}>
            {s === 'all' ? 'All' : s === 'completed' ? '✓ Done' : s === 'overdue' ? '✗ Missing' : '◷ Upcoming'}
          </button>
        ))}
      </div>

      {/* Assignment list */}
      <div style={{ maxHeight: 400, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {filtered.map((a, i) => (
          <div key={a.id} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 12px', borderRadius: 10,
            background: a.status === 'overdue' ? 'rgba(196,61,61,0.03)' : 'var(--bg-surface)',
            border: '1px solid var(--border-dim)',
            animation: `fadeUp 0.3s ease-out ${i * 30}ms both`,
          }}>
            {statusIcon(a.status)}

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span className="font-ui" style={{
                  fontSize: 12, fontWeight: 500, color: 'var(--text-primary)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>{a.title}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                <span className="font-data" style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {a.courseCode}
                </span>
                <span className="font-data" style={{ fontSize: 9, color: 'var(--text-dim)' }}>
                  {format(parseISO(a.dueDate), 'MMM d, yyyy')}
                </span>
              </div>
            </div>

            {/* Grade */}
            <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 50 }}>
              {a.percentage != null ? (
                <div>
                  <div className="font-data" style={{ fontSize: 13, fontWeight: 600, color: gradeColor(a.percentage) }}>
                    {a.percentage}%
                  </div>
                  <div className="font-data" style={{ fontSize: 9, color: 'var(--text-dim)' }}>
                    {a.grade}/{a.pointsPossible}
                  </div>
                </div>
              ) : a.status === 'overdue' ? (
                <span className="font-data" style={{ fontSize: 10, color: 'var(--risk-critical)', fontWeight: 600 }}>MISSING</span>
              ) : (
                <span className="font-data" style={{ fontSize: 10, color: 'var(--text-dim)' }}>—</span>
              )}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="font-ui" style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)', fontSize: 12 }}>
            No assignments match your filters.
          </div>
        )}
      </div>
    </div>
  )
}
