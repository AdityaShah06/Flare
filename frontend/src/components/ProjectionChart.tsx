'use client'
import { parseISO, addDays, format } from 'date-fns'
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from 'recharts'
import { TrendingUp, Minus, TrendingDown } from 'lucide-react'
import type { RiskHistoryPoint, Projection } from '@/types'
import { riskColorHex, scoreToLevel } from '@/lib/utils'

interface ProjectionChartProps {
  history: RiskHistoryPoint[]
  projection: Projection | null
  height?: number
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    const isProjected = data.type === 'projected'
    const color = riskColorHex(scoreToLevel(data.score))
    
    return (
      <div 
        className="px-3 py-3 rounded-xl border shadow-lg"
        style={{ background: '#fff', borderColor: 'var(--border-soft)' }}
      >
        <div className="font-ui text-[11px] text-[var(--text-muted)] mb-1">
          {format(new Date(label), 'MMM d, yyyy')}
        </div>
        <div className="font-display font-bold text-[22px] leading-none mb-1" style={{ color }}>
          {data.score.toFixed(1)}
        </div>
        <div className="font-data text-[9px] text-[var(--text-dim)] uppercase tracking-wider">
          {isProjected ? 'Projected' : 'Historical'}
        </div>
      </div>
    )
  }
  return null
}

export function ProjectionChart({ history, projection, height = 240 }: ProjectionChartProps) {
  if (history.length < 3) {
    return (
      <div className="w-full relative flex items-center justify-center" style={{ height }}>
        <div className="font-ui text-[12px] text-[var(--text-muted)] z-10">
          Insufficient history for projection
        </div>
        <div className="absolute inset-0 opacity-10 pointer-events-none border border-dashed border-[var(--border-dim)] rounded-xl" />
      </div>
    )
  }

  const currentScore = history[history.length - 1].score
  const currentLevel = scoreToLevel(currentScore)
  const colorHex = riskColorHex(currentLevel)

  const historicalData = history.map(p => ({
    date: parseISO(p.timestamp).getTime(),
    score: p.score,
    type: 'historical'
  }))
  
  const today = new Date()
  today.setHours(0,0,0,0) // Normalize

  const projectedData = projection?.projected_points.map(p => ({
    date: addDays(today, p.day).getTime(),
    score: p.score,
    type: 'projected'
  })) || []

  const mergedData = [...historicalData, ...projectedData]

  const todayTimestamp = today.getTime()
  const lastProjectedTimestamp = projectedData.length > 0 
    ? projectedData[projectedData.length - 1].date 
    : todayTimestamp

  const TrendIcon = projection?.trend === 'improving' ? TrendingDown :
                    projection?.trend === 'deteriorating' ? TrendingUp : Minus
  
  const trendColor = projection?.trend === 'improving' ? 'var(--risk-low)' :
                     projection?.trend === 'deteriorating' ? 'var(--risk-critical)' : 'var(--risk-medium)'

  return (
    <div className="w-full flex flex-col">
      <div style={{ height, width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={mergedData} margin={{ top: 10, right: 50, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id="historicalGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={colorHex} stopOpacity={0.3} />
                <stop offset="95%" stopColor={colorHex} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="projectedGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={colorHex} stopOpacity={0.1} />
                <stop offset="95%" stopColor={colorHex} stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid horizontal={true} vertical={false} stroke="rgba(0,0,0,0.04)" strokeDasharray="3 6" />
            
            <XAxis 
              dataKey="date" 
              type="number" 
              scale="time" 
              domain={['dataMin', 'dataMax']}
              tickFormatter={(val) => format(new Date(val), 'MMM d')}
              tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'DM Mono' }}
              tickCount={6}
              axisLine={false}
              tickLine={false}
              dy={10}
            />
            
            <YAxis 
              domain={[0, 100]} 
              ticks={[0, 25, 50, 75, 100]}
              tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'DM Mono' }}
              axisLine={false}
              tickLine={false}
              width={40}
            />

            <RechartsTooltip content={<CustomTooltip />} />

            {/* Historical Area */}
            <Area 
              type="monotone" 
              dataKey="score" 
              data={historicalData}
              fill="url(#historicalGrad)" 
              stroke="none" 
              activeDot={false}
            />

            {/* If projecting will cross critical, red reference area */}
            {projection?.will_cross_critical && (
               <ReferenceArea 
                 x1={todayTimestamp} 
                 x2={lastProjectedTimestamp}
                 y1={75} 
                 y2={100}
                 fill="rgba(255,45,85,0.06)"
                 stroke="none"
               />
            )}

            {/* Critical line 75 */}
            <ReferenceLine 
              y={75} 
              stroke="rgba(255,45,85,0.5)" 
              strokeDasharray="4 4"
              label={{ value: "CRITICAL", position: 'insideTopRight', fill: 'rgba(239,68,68,0.6)', fontSize: 9, fontFamily: 'DM Mono', dy: -5 }}
            />

            {/* Today vertical line */}
            <ReferenceLine 
              x={todayTimestamp} 
              stroke="rgba(0,0,0,0.12)" 
              strokeDasharray="3 3"
              label={{ value: "TODAY", position: 'insideTopLeft', fill: 'var(--text-muted)', fontSize: 9, fontFamily: 'DM Mono', dx: 5 }}
            />

            {/* Historical Line */}
            <Line 
              type="monotone" 
              dataKey="score" 
              data={historicalData}
              stroke={colorHex} 
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, fill: colorHex, stroke: '#fff', strokeWidth: 2 }}
              isAnimationActive={false}
            />

            {/* Projected Line */}
            {projectedData.length > 0 && (
              <Line 
                type="monotone" 
                dataKey="score" 
                data={projectedData}
                stroke={colorHex} 
                strokeWidth={1.8}
                strokeDasharray="7 4"
                opacity={0.65}
                dot={false}
                activeDot={false}
                isAnimationActive={false}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {projection && projection.trend !== 'insufficient_data' && (
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-[var(--border-dim)]">
          <TrendIcon size={14} style={{ color: trendColor }} />
          <span className="font-data text-[11px] text-[var(--text-secondary)]">
            {projection.slope > 0 ? '+' : ''}{projection.slope.toFixed(2)} pts/day
          </span>
          <span className="text-[var(--text-muted)] font-ui text-[11px] mx-1">·</span>
          <span className="font-ui text-[12px] font-medium uppercase tracking-wider" style={{ color: trendColor }}>
            {projection.trend}
          </span>
        </div>
      )}
    </div>
  )
}
