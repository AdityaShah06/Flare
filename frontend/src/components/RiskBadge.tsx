import type { RiskLevel } from '@/types'
import { riskColorHex, riskBg } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface RiskBadgeProps {
  level: RiskLevel
  score?: number
  size?: 'sm' | 'md' | 'lg'
  pulse?: boolean
}

export function RiskBadge({ level, score, size = 'sm', pulse = false }: RiskBadgeProps) {
  const isSm = size === 'sm'
  const isMd = size === 'md'
  const isLg = size === 'lg'

  return (
    <div
      className={cn("inline-flex items-center gap-1.5 rounded-md",
        isSm && "px-2 py-0.5",
        isMd && "px-3 py-1",
        isLg && "px-4 py-1.5"
      )}
      style={{
        background: riskBg(level),
        borderLeft: `3px solid ${riskColorHex(level)}`,
        borderTop: `1px solid ${riskColorHex(level)}40`,
        borderRight: `1px solid ${riskColorHex(level)}40`,
        borderBottom: `1px solid ${riskColorHex(level)}40`
      }}
    >
      <div 
        className={cn(
          "rounded-full",
          isSm && "w-[3px] h-[3px]",
          isMd && "w-[4px] h-[4px]",
          isLg && "w-[5px] h-[5px]",
          pulse && "animate-pulse-glow"
        )}
        style={{ backgroundColor: riskColorHex(level) }}
      />
      
      <span 
        className={cn("font-ui uppercase tracking-wide font-medium",
          isSm && "text-[10px]",
          isMd && "text-[11px]",
          isLg && "text-[13px]"
        )}
        style={{ color: riskColorHex(level) }}
      >
        {level}
      </span>
      
      {score !== undefined && (
        <span 
          className={cn("font-data opacity-80",
            isSm && "text-[10px]",
            isMd && "text-[11px]",
            isLg && "text-[13px]"
          )}
          style={{ color: riskColorHex(level) }}
        >
          {score.toFixed(1)}
        </span>
      )}
    </div>
  )
}
