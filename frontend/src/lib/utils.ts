import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { formatDistanceToNow, parseISO } from 'date-fns'
import type { RiskLevel } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function riskColor(level: RiskLevel): string {
  const map: Record<RiskLevel, string> = {
    low:      'var(--risk-low)',
    medium:   'var(--risk-medium)',
    high:     'var(--risk-high)',
    critical: 'var(--risk-critical)',
  }
  return map[level]
}

export function riskColorHex(level: RiskLevel): string {
  const map: Record<RiskLevel, string> = {
    low:      '#10B981',
    medium:   '#F59E0B',
    high:     '#F97316',
    critical: '#EF4444',
  }
  return map[level]
}

export function riskBg(level: RiskLevel): string {
  const map: Record<RiskLevel, string> = {
    low:      'var(--risk-low-bg)',
    medium:   'var(--risk-medium-bg)',
    high:     'var(--risk-high-bg)',
    critical: 'var(--risk-critical-bg)',
  }
  return map[level]
}

export function riskLabel(level: RiskLevel): string {
  return { low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical' }[level]
}

export function riskGlowClass(level: RiskLevel): string {
  return `glow-${level}`
}

export function yearLabel(year: number): string {
  return ['', 'Freshman', 'Sophomore', 'Junior', 'Senior'][year] ?? `Year ${year}`
}

export function gradeColor(grade: number): string {
  if (grade >= 80) return '#10B981'
  if (grade >= 70) return '#F59E0B'
  if (grade >= 60) return '#F97316'
  return '#EF4444'
}

export function gradeLetterGrade(grade: number): string {
  if (grade >= 93) return 'A'
  if (grade >= 90) return 'A-'
  if (grade >= 87) return 'B+'
  if (grade >= 83) return 'B'
  if (grade >= 80) return 'B-'
  if (grade >= 77) return 'C+'
  if (grade >= 73) return 'C'
  if (grade >= 70) return 'C-'
  if (grade >= 67) return 'D+'
  if (grade >= 60) return 'D'
  return 'F'
}

export function formatShapValue(feature: string, value: number): string {
  const formats: Record<string, () => string> = {
    missed_ratio:        () => `${Math.round(value * 100)}% missed`,
    avg_grade:           () => `avg ${value.toFixed(0)}%`,
    min_grade:           () => `min ${value.toFixed(0)}%`,
    credit_hours:        () => `${Math.round(value)} credits`,
    consecutive_missed:  () => `${Math.round(value)} straight`,
    grade_variance:      () => `σ = ${value.toFixed(1)}`,
    submission_velocity: () => `${Math.round(value)} / week`,
  }
  return formats[feature]?.() ?? value.toFixed(2)
}

export function timeAgo(isoString: string): string {
  try {
    return formatDistanceToNow(parseISO(isoString), { addSuffix: true })
  } catch {
    return 'recently'
  }
}

export function scoreToLevel(score: number): RiskLevel {
  if (score <= 25) return 'low'
  if (score <= 50) return 'medium'
  if (score <= 75) return 'high'
  return 'critical'
}
