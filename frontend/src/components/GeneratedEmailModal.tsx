'use client'
import { X, Sparkles, Send } from 'lucide-react'
import { format } from 'date-fns'

interface EmailContent {
  subject: string
  body: string
  generated_at: string
}

interface GeneratedEmailModalProps {
  isOpen: boolean
  onClose: () => void
  content: EmailContent | null
  isLoading: boolean
}

export function GeneratedEmailModal({ isOpen, onClose, content, isLoading }: GeneratedEmailModalProps) {
  if (!isOpen) return null

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      {/* Backdrop */}
      <div
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.2)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />

      {/* Modal */}
      <div className="animate-fade-up" style={{
        position: 'relative', width: '100%', maxWidth: 672,
        maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
        background: '#fff', borderRadius: 16,
        border: '1px solid var(--border-soft)',
        boxShadow: '0 24px 80px rgba(0,0,0,0.12)',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '1px solid var(--border-dim)', background: 'var(--bg-base)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'linear-gradient(135deg, rgba(124,58,237,0.1), rgba(236,72,153,0.1))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--accent-purple)',
            }}>
              <Sparkles size={16} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span className="font-ui" style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>AI Generated Intervention</span>
              <span className="font-ui" style={{ fontSize: 11, color: 'var(--text-muted)' }}>Personalized outreach draft</span>
            </div>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-muted)', cursor: 'pointer', background: 'none', border: 'none', padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
          {isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 0', gap: 16 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                border: '2px solid var(--accent-purple)', borderTopColor: 'transparent',
                animation: 'spin 1s linear infinite',
              }} />
              <span className="font-data" style={{ fontSize: 12, color: 'var(--accent-purple)' }}>Generating context-aware draft...</span>
            </div>
          ) : content ? (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span className="font-ui" style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 600, letterSpacing: '0.1em' }}>Subject</span>
                <div style={{
                  background: 'var(--bg-elevated)', border: '1px solid var(--border-dim)', borderRadius: 8,
                  padding: 12, fontSize: 14, color: 'var(--text-primary)',
                }} className="font-ui">
                  {content.subject}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span className="font-ui" style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 600, letterSpacing: '0.1em' }}>Message Body</span>
                <div style={{
                  background: 'var(--bg-elevated)', border: '1px solid var(--border-dim)', borderRadius: 8,
                  padding: 16, fontSize: 13, color: 'var(--text-secondary)',
                  whiteSpace: 'pre-wrap', lineHeight: 1.6, minHeight: 150,
                }} className="font-ui">
                  {content.body}
                </div>
              </div>

              <div className="font-data" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', paddingTop: 8, borderTop: '1px solid var(--border-dim)' }}>
                <span>Model: gpt-4o-mini</span>
                <span>Generated: {format(new Date(content.generated_at), 'HH:mm:ss')}</span>
              </div>
            </div>
          ) : (
            <div style={{ padding: '48px 0', textAlign: 'center', fontSize: 14, color: 'var(--text-secondary)' }} className="font-ui">Failed to load content.</div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px', display: 'flex', justifyContent: 'flex-end', gap: 12,
          borderTop: '1px solid var(--border-dim)', background: 'var(--bg-base)',
        }}>
          <button onClick={onClose} className="font-ui" style={{
            padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 500,
            color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer',
          }}>
            Discard
          </button>
          <button disabled={isLoading} className="font-ui" style={{
            padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 500,
            background: 'var(--accent-purple)', color: '#fff', border: 'none', cursor: 'pointer',
            opacity: isLoading ? 0.5 : 1,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <Send size={14} /> Send to Student
          </button>
        </div>
      </div>
    </div>
  )
}
