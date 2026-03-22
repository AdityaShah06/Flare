export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'

export type TrendDirection =
  | 'improving'
  | 'stable'
  | 'deteriorating'
  | 'insufficient_data'

export interface ShapEntry {
  feature: string
  value: number
  shap: number
  direction: 'risk' | 'protective'
  human_label: string
}

export interface RiskHistoryPoint {
  timestamp: string
  score: number
}

export interface ProjectionPoint {
  day: number
  score: number
}

export interface Projection {
  trend: TrendDirection
  slope: number
  projected_score_7d: number | null
  will_cross_critical: boolean
  projected_points: ProjectionPoint[]
}

export interface Assignment {
  id: string
  title: string
  due_date: string
  submitted: boolean
  grade: number | null
  points_possible: number
}

export interface Course {
  id: string
  name: string
  code: string
  credits: number
  current_grade: number
  assignments: Assignment[]
  instructor: string
}

export interface Student {
  id: string
  name: string
  email: string
  major: string
  year: number
  gpa: number
  advisor_id: string
  courses: Course[]
  risk_score: number
  risk_level: RiskLevel
  risk_flags: string[]
  risk_history: RiskHistoryPoint[]
  shap_explanation: ShapEntry[]
  projected_score_7d: number | null
  trend: TrendDirection
  will_cross_critical: boolean
  last_updated: string
  avatar_initials: string
}

export interface RiskDistribution {
  critical: number
  high: number
  medium: number
  low: number
}

export interface TimelineItem {
  assignment_id: string
  title: string
  course_name: string
  course_code: string
  due_date: string
  submitted: boolean
  grade: number | null
  days_until_due: number
  status: 'overdue' | 'due_soon' | 'upcoming' | 'completed'
}

export interface WebSocketMessage {
  type: 'risk_update' | 'system_reset'
  source?: 'autonomous_ingestion' | 'manual_event'
  student_id?: string
  student_name?: string
  major?: string
  old_risk_score?: number
  new_risk_score?: number
  risk_level?: RiskLevel
  risk_flags?: string[]
  event_type?: string
  event_description?: string
  projected_score_7d?: number | null
  trend?: TrendDirection
  will_cross_critical?: boolean
  timestamp: string
}

export interface AlertItem {
  id: string
  timestamp: string
  student_id: string
  student_name: string
  message: string
  risk_level: RiskLevel
  event_type: string
  source: 'autonomous_ingestion' | 'manual_event'
  old_score?: number
  new_score?: number
  projected_score_7d?: number | null
  trend?: TrendDirection
  will_cross_critical?: boolean
}

export interface DemoAccount {
  email: string
  name: string
  role: string
  user_id: string
}
