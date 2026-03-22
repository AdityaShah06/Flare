import type {
  Student,
  TimelineItem,
  RiskDistribution,
  Projection,
  DemoAccount
} from '@/types'
import { mockDb, DEMO_ACCOUNTS, DEMO_ACCOUNTS_LIST, generateNudgeMessage, generateAdvisorEmail } from './mockData'

// Simulate network latency for realism
const delay = (ms: number) => new Promise(r => setTimeout(r, ms))
const latency = () => delay(200 + Math.random() * 400)

export const api = {
  getStudents: async (): Promise<Student[]> => {
    await latency()
    return mockDb.getStudents()
  },

  getStudent: async (id: string): Promise<Student> => {
    await latency()
    const s = mockDb.getStudent(id)
    if (!s) throw new Error('Student not found')
    return s
  },

  getTimeline: async (id: string): Promise<TimelineItem[]> => {
    await latency()
    return mockDb.getTimeline(id)
  },

  getRiskAll: async (): Promise<Student[]> => {
    await latency()
    return mockDb.getStudents()
  },

  getRiskDistribution: async (): Promise<RiskDistribution> => {
    await latency()
    return mockDb.getRiskDistribution()
  },

  getRiskProjection: async (id: string): Promise<Projection> => {
    await latency()
    return mockDb.getRiskProjection(id)
  },

  postEvent: async (body: {
    student_id: string
    event_type: string
    payload: Record<string, unknown>
  }) => {
    await delay(300 + Math.random() * 500)
    const result = mockDb.postEvent(body)
    if (!result) throw new Error('Student not found')
    // Dispatch a custom event so the simulated WebSocket picks it up
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('flare-mock-event', {
        detail: {
          type: 'risk_update',
          source: 'manual_event',
          student_id: result.student.id,
          student_name: result.student.name,
          major: result.student.major,
          old_risk_score: result.student.risk_score - result.delta,
          new_risk_score: result.student.risk_score,
          risk_level: result.student.risk_level,
          risk_flags: result.student.risk_flags,
          event_type: body.event_type,
          event_description: body.event_type === 'grade_drop'
            ? `Grade dropped to ${body.payload.new_grade}% in course ${body.payload.course_id}`
            : `Missed assignment detected in course ${body.payload.course_id || 'unknown'}`,
          projected_score_7d: result.student.projected_score_7d,
          trend: result.student.trend,
          will_cross_critical: result.student.will_cross_critical,
          timestamp: new Date().toISOString(),
        }
      }))
    }
    return { status: 'ok' }
  },

  generateNudge: async (id: string) => {
    await delay(800 + Math.random() * 1200)  // Longer delay to simulate AI generation
    return generateNudgeMessage(id)
  },

  generateAdvisorEmail: async (id: string) => {
    await delay(1000 + Math.random() * 1500)  // Longer delay to simulate AI generation
    return generateAdvisorEmail(id)
  },

  login: async (email: string, password: string) => {
    await latency()
    const account = DEMO_ACCOUNTS[email]
    if (!account || account.password !== password) {
      throw new Error('Invalid credentials')
    }
    return {
      access_token: `mock-jwt-${Date.now()}`,
      user_type: account.user_type,
      user_id: account.user_id,
      name: account.name,
      email: email,
    }
  },

  getDemoAccounts: async (): Promise<DemoAccount[]> => {
    await delay(100)
    return DEMO_ACCOUNTS_LIST
  },

  resetDemo: async () => {
    await latency()
    mockDb.reset()
    // Dispatch reset event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('flare-mock-event', {
        detail: { type: 'system_reset', timestamp: new Date().toISOString() }
      }))
    }
    return { status: 'ok' }
  },

  pauseIngestion: async () => {
    await delay(100)
    mockDb.setIngestionPaused(true)
    return { status: 'ok' }
  },

  resumeIngestion: async () => {
    await delay(100)
    mockDb.setIngestionPaused(false)
    return { status: 'ok' }
  },

  getIngestionStatus: async () => {
    await delay(50)
    return { paused: mockDb.getIngestionPaused() }
  },
}
