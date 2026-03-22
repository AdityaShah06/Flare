import { cn } from '@/lib/utils'

interface LiveStatusBarProps {
  status: 'connecting' | 'connected' | 'disconnected'
  studentCount: number
}

export function LiveStatusBar({ status, studentCount }: LiveStatusBarProps) {
  if (status === 'connected') {
    return (
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-[var(--risk-low)] animate-pulse-glow" />
        <span className="font-data text-[11px] font-medium tracking-[0.12em] text-[var(--risk-low)]">LIVE</span>
        <span className="text-[var(--text-muted)]">·</span>
        <span className="font-data text-[11px] text-[var(--text-muted)]">{studentCount} monitored</span>
      </div>
    )
  }

  if (status === 'connecting') {
    return (
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-[var(--risk-medium)] animate-pulse" style={{ animationDuration: '1s' }} />
        <span className="font-data text-[11px] font-medium tracking-[0.12em] text-[var(--risk-medium)]">RECONNECTING...</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <div className="w-1.5 h-1.5 rounded-full bg-[var(--risk-critical)]" />
      <span className="font-data text-[11px] font-medium tracking-[0.12em] text-[var(--risk-critical)]">OFFLINE</span>
    </div>
  )
}
