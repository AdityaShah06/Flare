'use client'
import { useEffect, useRef } from 'react'

export function CursorGlow() {
  const blobRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const blob = blobRef.current
    if (!blob) return

    let x = 0, y = 0
    let bx = 0, by = 0

    const onMove = (e: MouseEvent) => {
      x = e.clientX
      y = e.clientY
    }
    window.addEventListener('mousemove', onMove)

    let raf: number
    const animate = () => {
      // Smooth lerp
      bx += (x - bx) * 0.08
      by += (y - by) * 0.08
      blob.style.transform = `translate(${bx - 300}px, ${by - 300}px)`
      raf = requestAnimationFrame(animate)
    }
    raf = requestAnimationFrame(animate)

    return () => {
      window.removeEventListener('mousemove', onMove)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <div
      ref={blobRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: 600,
        height: 600,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99,91,255,0.08) 0%, rgba(124,58,237,0.05) 30%, rgba(236,72,153,0.03) 60%, transparent 80%)',
        pointerEvents: 'none',
        zIndex: 1,
        willChange: 'transform',
        filter: 'blur(40px)',
      }}
    />
  )
}
