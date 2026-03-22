'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import type { WebSocketMessage } from '@/types'
import { mockDb } from '@/lib/mockData'

type Status = 'connecting' | 'connected' | 'disconnected'

export function useWebSocket(_url: string) {
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null)
  const [messages, setMessages] = useState<WebSocketMessage[]>([])
  const [status, setStatus] = useState<Status>('connecting')
  const intervalRef = useRef<ReturnType<typeof setInterval>>()
  const mounted = useRef(true)

  // Listen for manual events from api.postEvent and api.resetDemo
  useEffect(() => {
    const handler = (e: Event) => {
      if (!mounted.current) return
      const data = (e as CustomEvent).detail as WebSocketMessage
      setLastMessage(data)
      setMessages(prev => [data, ...prev].slice(0, 50))
    }
    window.addEventListener('flare-mock-event', handler)
    return () => window.removeEventListener('flare-mock-event', handler)
  }, [])

  // Simulate autonomous ingestion events every 15-30 seconds
  const startSimulation = useCallback(() => {
    // Immediately mark as connected
    if (mounted.current) setStatus('connected')

    intervalRef.current = setInterval(() => {
      if (!mounted.current) return
      const result = mockDb.simulateIngestionEvent()
      if (result) {
        const msg: WebSocketMessage = {
          type: 'risk_update',
          source: 'autonomous_ingestion',
          student_id: result.student.id,
          student_name: result.student.name,
          major: result.student.major,
          old_risk_score: result.oldScore,
          new_risk_score: result.student.risk_score,
          risk_level: result.student.risk_level,
          risk_flags: result.student.risk_flags,
          event_type: 'ingestion_check',
          event_description: result.description,
          projected_score_7d: result.student.projected_score_7d,
          trend: result.student.trend,
          will_cross_critical: result.student.will_cross_critical,
          timestamp: new Date().toISOString(),
        }
        setLastMessage(msg)
        setMessages(prev => [msg, ...prev].slice(0, 50))
      }
    }, 15000 + Math.random() * 15000) // 15-30 seconds
  }, [])

  useEffect(() => {
    mounted.current = true
    // Brief "connecting" state for visual effect
    const connectTimeout = setTimeout(() => {
      startSimulation()
    }, 800)

    return () => {
      mounted.current = false
      clearTimeout(connectTimeout)
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [startSimulation])

  return { lastMessage, messages, connectionStatus: status }
}
