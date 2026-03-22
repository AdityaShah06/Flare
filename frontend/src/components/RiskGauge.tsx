'use client'
import { useEffect, useRef, useState } from 'react'
import { riskColorHex, scoreToLevel } from '@/lib/utils'

interface RiskGaugeProps {
  score: number
  size?: number
  animated?: boolean
}

export function RiskGauge({ score, size = 140, animated = true }: RiskGaugeProps) {
  const [displayScore, setDisplayScore] = useState(animated ? 0 : score)
  const animRef = useRef<number>()
  const startRef = useRef(0)
  const fromRef = useRef(0)

  useEffect(() => {
    if (!animated) { setDisplayScore(score); return }
    fromRef.current = displayScore
    startRef.current = performance.now()
    const duration = 1400
    const animate = (now: number) => {
      const elapsed = now - startRef.current
      const t = Math.min(elapsed / duration, 1)
      const ease = 1 - Math.pow(1 - t, 4)
      setDisplayScore(fromRef.current + (score - fromRef.current) * ease)
      if (t < 1) animRef.current = requestAnimationFrame(animate)
    }
    animRef.current = requestAnimationFrame(animate)
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current) }
  }, [score, animated])

  const level = scoreToLevel(score)
  const colorHex = riskColorHex(level)
  const isCritical = score > 75

  const cx = size / 2
  const cy = size / 2
  const radius = size * 0.36
  const strokeWidth = size * 0.055
  // Arc spans 240° starting from bottom-left (150°) going clockwise to bottom-right (30° = 390°)
  const startAngle = 150
  const endAngle = 390
  const angleRange = endAngle - startAngle

  const polarToCartesian = (angleDeg: number) => {
    const rad = (angleDeg * Math.PI) / 180
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) }
  }

  // Build a clockwise arc from angle sa to ea
  const describeArc = (sa: number, ea: number) => {
    const s = polarToCartesian(sa)
    const e = polarToCartesian(ea)
    const large = (ea - sa) > 180 ? '1' : '0'
    return `M ${s.x} ${s.y} A ${radius} ${radius} 0 ${large} 1 ${e.x} ${e.y}`
  }

  const fullArcPath = describeArc(startAngle, endAngle)
  const scoreRatio = Math.min(Math.max(displayScore / 100, 0), 1)
  const circumference = 2 * Math.PI * radius
  const arcLength = (angleRange / 360) * circumference

  // Filled portion = scoreRatio * arcLength. Unfilled = the rest.
  // strokeDasharray = arcLength. dashoffset = unfilled portion.
  // Since the path goes left-to-right, we want to clip from the END:
  const dashOffset = arcLength * (1 - scoreRatio)

  const uid = useRef(`gauge-${Math.random().toString(36).slice(2, 8)}`).current

  const gradientColors = {
    low: ['#2D9B6E', '#4ADE80'],
    medium: ['#D4940A', '#FBBF24'],
    high: ['#D4660A', '#FB923C'],
    critical: ['#C43D3D', '#EF4444'],
  }
  const [c1, c2] = gradientColors[level]

  // Tick marks
  const ticks = Array.from({ length: 49 }, (_, i) => {
    const ratio = i / 48
    const a = startAngle + angleRange * ratio
    const isMajor = i % 12 === 0
    const rad = (a * Math.PI) / 180
    const outerR = radius + size * 0.06
    const innerR = outerR + (isMajor ? 7 : 3)
    return {
      x1: cx + outerR * Math.cos(rad), y1: cy + outerR * Math.sin(rad),
      x2: cx + innerR * Math.cos(rad), y2: cy + innerR * Math.sin(rad),
      major: isMajor, key: i,
    }
  })

  // Scale labels — 0, 25, 50, 75, 100
  const scaleLabels = [0, 25, 50, 75, 100].map(v => {
    const a = startAngle + angleRange * (v / 100)
    const rad = (a * Math.PI) / 180
    const labelR = radius + size * 0.14
    return { x: cx + labelR * Math.cos(rad), y: cy + labelR * Math.sin(rad), v }
  })

  // Needle position
  const needleAngle = startAngle + angleRange * scoreRatio
  const needleRad = (needleAngle * Math.PI) / 180
  const needleLen = radius * 0.65
  const needleX = cx + needleLen * Math.cos(needleRad)
  const needleY = cy + needleLen * Math.sin(needleRad)

  // Animated needle
  const [needleAnim, setNeedleAnim] = useState(startAngle)
  useEffect(() => {
    if (!animated) { setNeedleAnim(startAngle + angleRange * (score / 100)); return }
    const target = startAngle + angleRange * (score / 100)
    const from = needleAnim
    const start = performance.now()
    const dur = 1400
    let raf = 0
    const anim = (now: number) => {
      const t = Math.min((now - start) / dur, 1)
      const ease = 1 - Math.pow(1 - t, 4)
      setNeedleAnim(from + (target - from) * ease)
      if (t < 1) raf = requestAnimationFrame(anim)
    }
    raf = requestAnimationFrame(anim)
    return () => cancelAnimationFrame(raf)
  }, [score, animated])

  const animNeedleRad = (needleAnim * Math.PI) / 180
  const aNx = cx + needleLen * Math.cos(animNeedleRad)
  const aNy = cy + needleLen * Math.sin(animNeedleRad)

  const labelText = level === 'critical' ? 'CRITICAL' : level === 'high' ? 'AT RISK' : level === 'medium' ? 'MONITOR' : 'HEALTHY'

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id={`${uid}-grad`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={c1} />
            <stop offset="100%" stopColor={c2} />
          </linearGradient>
          <filter id={`${uid}-glow`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id={`${uid}-soft`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feColorMatrix in="blur" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.25 0" />
          </filter>
        </defs>

        {/* Ambient glow for critical */}
        {isCritical && (
          <circle cx={cx} cy={cy} r={radius + size * 0.12} fill="none" stroke={c1} strokeWidth="2" opacity="0.15"
            style={{ animation: 'breathe 2.5s ease-in-out infinite' }} />
        )}

        {/* Outer ring */}
        <circle cx={cx} cy={cy} r={radius + size * 0.08} fill="none" stroke="var(--border-dim)" strokeWidth="0.5" />

        {/* Tick marks */}
        <g opacity="0.3">
          {ticks.map(t => (
            <line key={t.key} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
              stroke="var(--text-muted)" strokeWidth={t.major ? 1.5 : 0.6} />
          ))}
        </g>

        {/* Scale labels */}
        <g>
          {scaleLabels.map(l => (
            <text key={l.v} x={l.x} y={l.y} textAnchor="middle" dominantBaseline="central"
              style={{ fontSize: size * 0.055, fill: 'var(--text-dim)', fontFamily: "'JetBrains Mono', monospace" }}>
              {l.v}
            </text>
          ))}
        </g>

        {/* Track */}
        <path d={fullArcPath} fill="none" stroke="var(--bg-deep)" strokeWidth={strokeWidth} strokeLinecap="round" />

        {/* Soft glow under value arc */}
        <path d={fullArcPath} fill="none" stroke={c1} strokeWidth={strokeWidth + 8}
          strokeLinecap="round" strokeDasharray={arcLength} strokeDashoffset={dashOffset}
          filter={`url(#${uid}-soft)`} opacity="0.4" />

        {/* Value arc — left to right fill */}
        <path d={fullArcPath} fill="none" stroke={`url(#${uid}-grad)`} strokeWidth={strokeWidth}
          strokeLinecap="round" filter={`url(#${uid}-glow)`}
          strokeDasharray={arcLength}
          strokeDashoffset={dashOffset}
          style={{ transition: animated ? 'stroke-dashoffset 1.4s cubic-bezier(0.16, 1, 0.3, 1)' : 'none' }}
        />

        {/* Needle */}
        <line x1={cx} y1={cy} x2={aNx} y2={aNy}
          stroke={colorHex} strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
        {/* Needle hub */}
        <circle cx={cx} cy={cy} r="4" fill={colorHex} opacity="0.8" />
        <circle cx={cx} cy={cy} r="2" fill="var(--bg-card)" />

        {/* Inner fill circle */}
        <circle cx={cx} cy={cy} r={size * 0.24}
          fill="var(--bg-card)" stroke="var(--border-dim)" strokeWidth="0.5" />
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
        style={{ paddingTop: size * 0.02 }}>
        <div style={{
          color: colorHex, fontSize: size * 0.22, fontWeight: 700, lineHeight: 1,
          animation: animated ? 'scoreReveal 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.6s both' : 'none',
        }} className="font-data">
          {Math.round(displayScore)}
        </div>
        <div style={{
          fontSize: Math.max(8, size * 0.055), marginTop: 3,
          color: colorHex, opacity: 0.65, letterSpacing: '0.15em',
        }} className="font-data uppercase">
          {labelText}
        </div>
      </div>
    </div>
  )
}
