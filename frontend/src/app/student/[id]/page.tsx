'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { useWebSocket } from '@/hooks'
import type { Student, TimelineItem, Projection } from '@/types'
import {
  RiskGauge,
  RiskBadge,
  ShapExplainer,
  ProjectionChart,
  CourseBreakdown,
  GeneratedEmailModal,
  PerformanceTimeline,
  AssignmentHistory,
} from '@/components'
import {
  ArrowLeft,
  Mail,
  MessageCircle,
  GraduationCap,
  Clock,
  CheckCircle2,
  XOctagon,
  AlertCircle
} from 'lucide-react'
import { yearLabel } from '@/lib/utils'
import { format, parseISO } from 'date-fns'

export default function StudentDetail() {
  const { id } = useParams()
  const router = useRouter()
  const studentId = typeof id === 'string' ? id : id[0]

  const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws'
  const { lastMessage } = useWebSocket(wsUrl)

  const [student, setStudent] = useState<Student | null>(null)
  const [timeline, setTimeline] = useState<TimelineItem[]>([])
  const [projection, setProjection] = useState<Projection | null>(null)
  const [loading, setLoading] = useState(true)

  const [emailModalOpen, setEmailModalOpen] = useState(false)
  const [emailLoading, setEmailLoading] = useState(false)
  const [emailContent, setEmailContent] = useState<any>(null)

  const [nudgeLoading, setNudgeLoading] = useState(false)
  const [nudgeSent, setNudgeSent] = useState(false)

  const loadData = async () => {
    try {
      const [sData, tData, pData] = await Promise.all([
        api.getStudent(studentId),
        api.getTimeline(studentId),
        api.getRiskProjection(studentId)
      ])
      setStudent(sData)
      setTimeline(tData)
      setProjection(pData)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [studentId])

  useEffect(() => {
    if (!lastMessage || !student) return
    if (lastMessage.type === 'system_reset' || lastMessage.student_id === studentId) {
      loadData()
    }
  }, [lastMessage, studentId])

  const handleGenerateEmail = async () => {
    setEmailModalOpen(true)
    setEmailContent(null)
    setEmailLoading(true)
    try {
      const res = await api.generateAdvisorEmail(studentId)
      setEmailContent(res)
    } catch (e) {
      console.error(e)
    } finally {
      setEmailLoading(false)
    }
  }

  const handleGenerateNudge = async () => {
    setNudgeLoading(true)
    try {
      await api.generateNudge(studentId)
      setNudgeSent(true)
      setTimeout(() => setNudgeSent(false), 3000)
    } finally {
      setNudgeLoading(false)
    }
  }

  if (loading || !student) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg-base)',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            border: '2px solid var(--accent-warm)', borderTopColor: 'transparent',
            animation: 'ringRotate 0.8s linear infinite',
          }} />
          <span className="font-ui" style={{ fontSize: 13, color: 'var(--text-muted)' }}>Loading Profile...</span>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 80, background: 'var(--bg-base)' }}>
      {/* Top Navigation */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: 'var(--bg-glass)', backdropFilter: 'blur(20px) saturate(1.2)', WebkitBackdropFilter: 'blur(20px) saturate(1.2)',
        borderBottom: '1px solid var(--border-dim)',
        padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button
            onClick={() => router.push('/advisor')}
            style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'var(--bg-card)', border: '1px solid var(--border-soft)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-secondary)', cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <ArrowLeft size={16} />
          </button>

          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            border: '1px solid var(--border-soft)', background: 'var(--bg-card)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, color: 'var(--text-primary)',
          }} className="font-data">
            {student.avatar_initials}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <h1 className="font-display hover-glow" style={{ fontSize: 22, fontWeight: 400, color: 'var(--text-primary)', lineHeight: 1.2, display: 'flex', alignItems: 'center', gap: 12, cursor: 'default' }}>
              {student.name}
              <RiskBadge level={student.risk_level} size="md" />
            </h1>
            <span className="font-ui" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              {student.id} · {student.major} · {yearLabel(student.year)}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={handleGenerateNudge}
            disabled={nudgeLoading || nudgeSent}
            className="font-ui"
            style={{
              padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 500,
              display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
              transition: 'all 0.2s',
              ...(nudgeSent ? {
                background: 'rgba(45,155,110,0.06)', border: '1px solid rgba(45,155,110,0.2)', color: '#2D9B6E',
              } : {
                background: '#4A453E', border: 'none', color: 'rgba(255,255,255,0.9)',
              }),
            }}
          >
            {nudgeLoading ? (
              <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid var(--text-muted)', borderTopColor: 'transparent', animation: 'ringRotate 0.8s linear infinite' }} />
            ) : nudgeSent ? (
              <CheckCircle2 size={14} />
            ) : (
              <MessageCircle size={14} />
            )}
            {nudgeSent ? 'Nudge Sent' : 'Send Nudge'}
          </button>

          <button
            onClick={handleGenerateEmail}
            className="font-ui"
            style={{
              padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 500,
              background: 'linear-gradient(135deg, #3A3530 0%, #4A453E 100%)', color: 'rgba(255,255,255,0.92)', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
              transition: 'all 0.2s',
            }}
          >
            <Mail size={14} />
            Draft Advisor Email
          </button>
        </div>
      </nav>

      <main style={{
        maxWidth: 1400, margin: '0 auto', width: '100%',
        padding: '32px 24px',
      }}>
        {/* ROW 1: 3-column — Risk | Projection & Courses | Timeline */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: 24, marginBottom: 24 }}>
          {/* LEFT: Risk & SHAP */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <h3 className="font-ui" style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', width: '100%', textAlign: 'left', marginBottom: 20, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                Live Risk Assessment
              </h3>
              <RiskGauge score={student.risk_score} size={240} animated={true} />
              <div style={{ width: '100%', marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border-dim)', display: 'flex', justifyContent: 'center', gap: 32 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <span className="font-ui" style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Current GPA</span>
                  <span className="font-display" style={{ fontSize: 36, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1 }}>{student.gpa.toFixed(2)}</span>
                </div>
                <div style={{ width: 1, background: 'var(--border-dim)' }} />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <span className="font-ui" style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Credit Hours</span>
                  <span className="font-display" style={{ fontSize: 36, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1 }}>{student.courses.reduce((s, c) => s + c.credits, 0)}</span>
                </div>
              </div>
            </div>

            <div className="card" style={{ padding: 24 }}>
              <h3 className="font-ui" style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 20, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                Risk Drivers
              </h3>
              <ShapExplainer explanation={student.shap_explanation} probability={0.8} />
            </div>
          </div>

          {/* MIDDLE: Projection & Courses */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="card" style={{ padding: 24 }}>
              <h3 className="font-ui" style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 20, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                7-Day Risk Projection
              </h3>
              <ProjectionChart history={student.risk_history} projection={projection} height={260} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <h3 className="font-ui hover-glow" style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8, marginLeft: 4, cursor: 'default' }}>
                <GraduationCap size={18} style={{ color: 'var(--text-secondary)' }} />
                Course Performance
              </h3>
              <CourseBreakdown courses={student.courses} />
            </div>
          </div>

          {/* RIGHT: Timeline */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h3 className="font-ui hover-glow" style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8, marginLeft: 4, marginBottom: 4, cursor: 'default' }}>
              <Clock size={16} style={{ color: 'var(--text-secondary)' }} />
              Academic Timeline
            </h3>

            <div style={{ position: 'relative', paddingLeft: 16 }}>
              {/* Vertical line */}
              <div style={{
                position: 'absolute', left: 20, top: 0, bottom: 0,
                width: 1, background: 'linear-gradient(to bottom, var(--border-soft), transparent)',
              }} />

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {timeline.slice(0, 15).map((item, idx) => {
                  const Icon = item.status === 'completed' ? CheckCircle2 :
                    item.status === 'overdue' ? XOctagon :
                      item.status === 'due_soon' ? AlertCircle : Clock

                  const iconColor = item.status === 'completed' ? 'var(--risk-low)' :
                    item.status === 'overdue' ? 'var(--risk-critical)' :
                      item.status === 'due_soon' ? 'var(--risk-medium)' : 'var(--text-muted)'

                  const dateObj = parseISO(item.due_date)

                  return (
                    <div key={`${item.assignment_id}-${idx}`} style={{ position: 'relative', display: 'flex', alignItems: 'flex-start' }}>
                      {/* Icon */}
                      <div style={{
                        position: 'absolute', left: -4,
                        width: 24, height: 24, borderRadius: '50%',
                        background: 'var(--bg-card)', border: `1px solid var(--border-dim)`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 10,
                      }}>
                        <Icon size={12} style={{ color: iconColor }} />
                      </div>

                      {/* Card */}
                      <div className="card" style={{ marginLeft: 28, width: '100%', padding: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                          <span className="font-ui" style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.3 }}>{item.title}</span>
                          <span className="font-data" style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0, marginLeft: 8 }}>
                            {format(dateObj, 'MMM d')}
                          </span>
                        </div>
                        <div className="font-data" style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          {item.course_code}
                        </div>

                        {item.status === 'completed' && item.grade !== null && (
                          <div className="font-data" style={{ fontSize: 12, color: 'var(--risk-low)' }}>{item.grade} pts</div>
                        )}
                        {item.status === 'overdue' && (
                          <div className="font-data" style={{ fontSize: 10, color: 'var(--risk-critical)' }}>Missing</div>
                        )}
                        {item.status === 'due_soon' && (
                          <div className="font-data" style={{ fontSize: 10, color: 'var(--risk-medium)' }}>Due in {Math.round(item.days_until_due)} days</div>
                        )}
                        {item.status === 'upcoming' && (
                          <div className="font-data" style={{ fontSize: 10, color: 'var(--text-dim)' }}>Upcoming</div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {timeline.length === 0 && (
              <div className="font-ui" style={{ color: 'var(--text-muted)', fontSize: 12, fontStyle: 'italic', paddingLeft: 8 }}>
                No recent activity recorded.
              </div>
            )}
          </div>
        </div>

        {/* ROW 2: Full-width Performance Timeline */}
        <div style={{ marginBottom: 24 }}>
          <PerformanceTimeline student={student} />
        </div>

        {/* ROW 3: Assignment History */}
        <div>
          <AssignmentHistory student={student} />
        </div>
      </main>

      <GeneratedEmailModal
        isOpen={emailModalOpen}
        onClose={() => setEmailModalOpen(false)}
        content={emailContent}
        isLoading={emailLoading}
      />
    </div>
  )
}
