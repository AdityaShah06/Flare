'use client'
import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import type { Student, WebSocketMessage } from '@/types'

export function useStudents(lastMessage: WebSocketMessage | null) {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStudents = useCallback(async () => {
    try {
      const data = await api.getStudents()
      setStudents(data.sort((a, b) => b.risk_score - a.risk_score))
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load students')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchStudents() }, [fetchStudents])

  useEffect(() => {
    if (!lastMessage) return
    if (lastMessage.type === 'system_reset') {
      fetchStudents()
      return
    }
    if (lastMessage.type === 'risk_update' && lastMessage.student_id) {
      setStudents(prev =>
        prev.map(s =>
          s.id === lastMessage.student_id
            ? {
                ...s,
                risk_score:          lastMessage.new_risk_score ?? s.risk_score,
                risk_level:          lastMessage.risk_level ?? s.risk_level,
                risk_flags:          lastMessage.risk_flags ?? s.risk_flags,
                projected_score_7d:  lastMessage.projected_score_7d ?? s.projected_score_7d,
                trend:               lastMessage.trend ?? s.trend,
                will_cross_critical: lastMessage.will_cross_critical ?? s.will_cross_critical,
                last_updated:        lastMessage.timestamp,
                risk_history: [
                  ...s.risk_history,
                  { timestamp: lastMessage.timestamp, score: lastMessage.new_risk_score ?? s.risk_score }
                ].slice(-30),
              }
            : s
        ).sort((a, b) => b.risk_score - a.risk_score)
      )
    }
  }, [lastMessage, fetchStudents])

  return { students, loading, error, refetch: fetchStudents }
}
