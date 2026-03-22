"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import type { DemoAccount } from "@/types";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [demoAccounts, setDemoAccounts] = useState<DemoAccount[]>([]);

  useEffect(() => {
    const token = localStorage.getItem("flare_token");
    const userType = localStorage.getItem("flare_user_type");
    if (token && userType) {
      if (userType === "advisor") router.replace("/advisor");
      else {
        const uid = localStorage.getItem("flare_user_id");
        router.replace(`/student/${uid}`);
      }
    }
    api.getDemoAccounts().then(setDemoAccounts).catch(() => {});
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.login(email, password);
      localStorage.setItem("flare_token", res.access_token);
      localStorage.setItem("flare_user_type", res.user_type);
      localStorage.setItem("flare_user_id", res.user_id);
      localStorage.setItem("flare_user_name", res.name);
      localStorage.setItem("flare_user_email", res.email);
      if (res.user_type === "advisor") router.push("/advisor");
      else router.push(`/student/${res.user_id}`);
    } catch {
      setError("Invalid credentials. Try demo1234 as password.");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = (account: DemoAccount) => {
    setEmail(account.email);
    setPassword("demo1234");
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-base)', position: 'relative', overflow: 'hidden',
    }}>
      {/* Subtle ambient gradient */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at 50% 30%, rgba(212,102,10,0.04) 0%, transparent 70%)',
      }} />

      <div className="animate-fade-in" style={{ width: '100%', maxWidth: 400, margin: '0 16px', position: 'relative', zIndex: 10 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: 'var(--gradient-flare)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(212, 102, 10, 0.3)',
            }}>
              <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
                <path d="M16 3C16 3 10 8 10 14C10 17 12 19 14 20C11 18 7 16 5 12C5 12 7 20 14 22C12 22 6 24 4 28C4 28 10 26 16 26C22 26 28 28 28 28C26 24 20 22 18 22C25 20 27 12 27 12C25 16 21 18 18 20C20 19 22 17 22 14C22 8 16 3 16 3Z" fill="white" fillOpacity="0.95"/>
                <path d="M16 8C16 8 13 12 13 15.5C13 17.5 14.3 19 16 19C17.7 19 19 17.5 19 15.5C19 12 16 8 16 8Z" fill="white" fillOpacity="0.5"/>
              </svg>
            </div>
            <h1 className="font-ui" style={{ fontSize: 28, fontWeight: 700, letterSpacing: '0.14em', color: 'var(--text-primary)' }}>
              FLARE
            </h1>
          </div>
          <p className="font-ui" style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 4 }}>
            Student Retention Intelligence
          </p>
          <p className="font-data" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            Truman State University
          </p>
        </div>

        {/* Login form */}
        <form onSubmit={handleSubmit} className="card" style={{ padding: 28 }}>
          <div style={{ marginBottom: 18 }}>
            <label className="font-ui" style={{
              display: 'block', fontSize: 10, fontWeight: 600, color: 'var(--text-muted)',
              textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 6,
            }}>Email</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              className="font-ui"
              style={{
                width: '100%', padding: '10px 14px',
                background: 'var(--bg-base)', border: '1px solid var(--border-dim)',
                borderRadius: 10, fontSize: 13, color: 'var(--text-primary)',
                outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s',
                boxSizing: 'border-box',
              }}
              placeholder="advisor@truman.edu" required
              onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent-warm)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(196,118,90,0.08)' }}
              onBlur={e => { e.currentTarget.style.borderColor = 'var(--border-dim)'; e.currentTarget.style.boxShadow = 'none' }}
            />
          </div>

          <div style={{ marginBottom: 18, position: 'relative' }}>
            <label className="font-ui" style={{
              display: 'block', fontSize: 10, fontWeight: 600, color: 'var(--text-muted)',
              textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 6,
            }}>Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? "text" : "password"} value={password}
                onChange={e => setPassword(e.target.value)}
                className="font-ui"
                style={{
                  width: '100%', padding: '10px 40px 10px 14px',
                  background: 'var(--bg-base)', border: '1px solid var(--border-dim)',
                  borderRadius: 10, fontSize: 13, color: 'var(--text-primary)',
                  outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s',
                  boxSizing: 'border-box',
                }}
                placeholder="Enter password" required
                onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent-warm)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(196,118,90,0.08)' }}
                onBlur={e => { e.currentTarget.style.borderColor = 'var(--border-dim)'; e.currentTarget.style.boxShadow = 'none' }}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-muted)', transition: 'color 0.2s',
                }}>
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="font-ui" style={{
              fontSize: 12, color: 'var(--risk-critical)',
              background: 'var(--risk-critical-bg)', border: '1px solid rgba(196,61,61,0.2)',
              borderRadius: 10, padding: '10px 14px', marginBottom: 18,
            }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading}
            className="font-ui"
            style={{
              width: '100%', padding: '12px 0', borderRadius: 10,
              background: 'var(--gradient-flare)', color: '#fff',
              fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'opacity 0.2s, transform 0.2s',
              opacity: loading ? 0.7 : 1,
              boxShadow: '0 4px 16px rgba(212, 102, 10, 0.2)',
            }}>
            {loading ? (
              <>
                <Loader2 size={16} style={{ animation: 'ringRotate 0.8s linear infinite' }} />
                Signing in…
              </>
            ) : "Sign In"}
          </button>
        </form>

        {/* Demo accounts */}
        {demoAccounts.length > 0 && (
          <div style={{
            marginTop: 20, padding: 20,
            background: 'rgba(250,247,242,0.5)', border: '1px solid var(--border-dim)',
            borderRadius: 16,
          }}>
            <p className="font-ui" style={{
              fontSize: 10, fontWeight: 600, color: 'var(--text-muted)',
              textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 12,
            }}>
              Demo Accounts
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {demoAccounts.map(account => (
                <button key={account.email} onClick={() => handleDemoLogin(account)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 14px', background: 'var(--bg-card)', border: '1px solid var(--border-dim)',
                    borderRadius: 10, cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-soft)'; e.currentTarget.style.transform = 'translateX(2px)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-dim)'; e.currentTarget.style.transform = 'none' }}
                >
                  <div>
                    <p className="font-ui" style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', margin: 0 }}>{account.name}</p>
                    <p className="font-data" style={{ fontSize: 10, color: 'var(--text-muted)', margin: 0 }}>{account.email}</p>
                  </div>
                  <span className="font-data" style={{
                    fontSize: 9, padding: '2px 8px', borderRadius: 6,
                    background: 'rgba(212,102,10,0.08)', color: 'var(--accent-warm)',
                    fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em',
                  }}>
                    {account.role}
                  </span>
                </button>
              ))}
            </div>
            <p className="font-data" style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', marginTop: 12 }}>
              Password: <code style={{ color: 'var(--text-secondary)' }}>demo1234</code>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
