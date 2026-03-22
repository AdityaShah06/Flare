import type { Course } from '@/types'
import { gradeColor, gradeLetterGrade } from '@/lib/utils'

interface CourseBreakdownProps {
  courses: Course[]
}

export function CourseBreakdown({ courses }: CourseBreakdownProps) {
  return (
    <div className="space-y-3">
      {courses.map(course => {
        const gradeColorHex = gradeColor(course.current_grade)
        
        return (
          <div key={course.id} className="card" style={{ padding: 16 }}>
            {/* Header row */}
            <div className="flex justify-between items-start">
              <div className="flex flex-col">
                <span className="font-data text-[11px] text-[var(--text-muted)] uppercase tracking-wider">
                  {course.code}
                </span>
                <span className="font-display text-[14px] font-semibold text-[var(--text-primary)] mt-0.5">
                  {course.name}
                </span>
                <span className="font-ui text-[11px] italic text-[var(--text-secondary)]">
                  {course.instructor}
                </span>
              </div>
              <div className="flex flex-col text-right items-end">
                <div className="flex items-baseline">
                  <span className="font-data text-[24px] font-bold" style={{ color: gradeColorHex }}>
                    {Math.round(course.current_grade)}
                  </span>
                  <span className="font-data text-[12px] ml-1" style={{ color: gradeColorHex }}>
                    {gradeLetterGrade(course.current_grade)}
                  </span>
                </div>
                <span className="font-ui text-[10px] text-[var(--text-muted)]">
                  {course.credits} credits
                </span>
              </div>
            </div>

            {/* Grade Bar */}
            <div className="h-[3px] rounded-full bg-[var(--bg-elevated)] relative overflow-hidden mt-3">
              <div 
                className="absolute left-0 top-0 bottom-0 rounded-full"
                style={{
                  width: `${course.current_grade}%`,
                  background: `linear-gradient(90deg, ${gradeColorHex}, ${gradeColorHex}99)`,
                  boxShadow: `0 0 8px ${gradeColorHex}80`,
                  transition: 'width 1000ms ease-out'
                }}
              />
            </div>

            {/* Assignment Pills */}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {course.assignments.slice(0, 6).map(assignment => {
                const due = new Date(assignment.due_date)
                const now = new Date()
                const hoursUntilDue = (due.getTime() - now.getTime()) / (1000 * 60 * 60)
                
                let status: 'graded' | 'submitted' | 'overdue' | 'soon' | 'upcoming'
                if (assignment.submitted && assignment.grade !== null) status = 'graded'
                else if (assignment.submitted) status = 'submitted'
                else if (hoursUntilDue < 0) status = 'overdue'
                else if (hoursUntilDue < 48) status = 'soon'
                else status = 'upcoming'

                const styles = {
                  graded: { bg: 'rgba(0,229,160,0.1)', border: 'rgba(0,229,160,0.25)', text: 'var(--risk-low)' },
                  submitted: { bg: 'rgba(77,159,255,0.1)', border: 'rgba(77,159,255,0.25)', text: 'var(--accent-blue)' },
                  overdue: { bg: 'rgba(255,45,85,0.1)', border: 'rgba(255,45,85,0.3)', text: 'var(--risk-critical)' },
                  soon: { bg: 'rgba(255,176,32,0.1)', border: 'rgba(255,176,32,0.25)', text: 'var(--risk-medium)' },
                  upcoming: { bg: 'var(--bg-elevated)', border: 'var(--border-dim)', text: 'var(--text-muted)' },
                }
                const s = styles[status]

                return (
                  <div key={assignment.id} className="relative group">
                    <div 
                      className="rounded-full px-2.5 py-1 font-ui text-[10px] flex items-center border cursor-default"
                      style={{ backgroundColor: s.bg, borderColor: s.border, color: s.text }}
                    >
                      {status === 'overdue' && (
                        <div className="w-[4px] h-[4px] rounded-full bg-[var(--risk-critical)] mr-1.5 animate-pulse-glow" />
                      )}
                      {assignment.title.length > 16 ? assignment.title.substring(0, 16) + '...' : assignment.title}
                    </div>
                    
                    {/* Tooltip */}
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-[calc(100%+8px)] w-max max-w-[200px] p-2 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50"
                      style={{ background: '#fff', border: '1px solid var(--border-soft)' }}>
                      <div className="font-ui text-[11px] text-[var(--text-primary)] font-medium mb-1 break-words whitespace-normal">{assignment.title}</div>
                      <div className="font-data text-[9px] text-[var(--text-muted)]">
                        Due: {due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </div>
                      {assignment.grade !== null && (
                        <div className="font-data text-[10px] text-[var(--risk-low)] mt-0.5">
                          Grade: {assignment.grade}/{assignment.points_possible}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
