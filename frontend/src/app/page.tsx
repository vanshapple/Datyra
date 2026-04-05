'use client'
import { useState, useRef, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// ─── Auth Modal ───────────────────────────────────────────────────────────────
function AuthModal({ onClose, onAuth }: { onClose: () => void; onAuth: (user: any) => void }) {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async () => {
    if (!email || !password) { setError('Please fill in all fields'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      if (mode === 'signup') {
        const { data, error: err } = await supabase.auth.signUp({ email, password })
        if (err) throw err
        if (data.user && !data.session) {
          setSuccess('Check your email to confirm your account, then sign in.')
        } else if (data.session) {
          onAuth(data.user)
          onClose()
        }
      } else {
        const { data, error: err } = await supabase.auth.signInWithPassword({ email, password })
        if (err) throw err
        onAuth(data.user)
        onClose()
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed')
    }
    setLoading(false)
  }

  return (
    <>
      <style>{`
        .modal-backdrop {
          position: fixed; inset: 0; z-index: 100;
          background: rgba(10,10,15,0.85);
          backdrop-filter: blur(12px);
          display: flex; align-items: center; justify-content: center;
          padding: 24px;
          animation: fadeIn 0.2s ease;
        }
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        .modal {
          background: #0f0f17;
          border: 1px solid rgba(255,255,255,0.09);
          border-radius: 24px;
          padding: 36px;
          width: 100%;
          max-width: 420px;
          box-shadow: 0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(99,102,241,0.1);
          animation: slideUp 0.3s cubic-bezier(0.16,1,0.3,1);
          position: relative;
        }
        @keyframes slideUp { from { opacity: 0; transform: translateY(24px) } to { opacity: 1; transform: translateY(0) } }
        .modal-close {
          position: absolute; top: 20px; right: 20px;
          background: rgba(255,255,255,0.06); border: none; border-radius: 8px;
          color: #6b6a75; cursor: pointer; font-size: 18px;
          width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
          transition: all 0.2s;
        }
        .modal-close:hover { background: rgba(255,255,255,0.1); color: #e8e6e0; }
        .modal-title { font-size: 22px; font-weight: 800; color: #e8e6e0; margin-bottom: 4px; }
        .modal-sub { font-family: 'DM Mono', monospace; font-size: 12px; color: #6b6a75; margin-bottom: 28px; }
        .mode-tabs { display: flex; background: rgba(255,255,255,0.04); border-radius: 10px; padding: 3px; margin-bottom: 24px; }
        .mode-tab {
          flex: 1; padding: 8px; text-align: center; border-radius: 8px;
          font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s;
          border: none; background: transparent; color: #6b6a75; font-family: 'Syne', sans-serif;
        }
        .mode-tab.active { background: rgba(99,102,241,0.2); color: #6366f1; }
        .field { margin-bottom: 14px; }
        .field label { display: block; font-family: 'DM Mono', monospace; font-size: 10px; color: #6b6a75; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 6px; }
        .field input {
          width: 100%; padding: 12px 14px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 10px; color: #e8e6e0;
          font-family: 'DM Mono', monospace; font-size: 13px;
          outline: none; transition: all 0.2s;
        }
        .field input:focus { border-color: rgba(99,102,241,0.4); background: rgba(99,102,241,0.04); }
        .field input::placeholder { color: #3d3c47; }
        .auth-btn {
          width: 100%; padding: 14px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          border: none; border-radius: 12px; color: white;
          font-family: 'Syne', sans-serif; font-size: 14px; font-weight: 700;
          cursor: pointer; transition: all 0.2s; margin-top: 4px;
          display: flex; align-items: center; justify-content: center; gap: 8px;
        }
        .auth-btn:hover { transform: translateY(-1px); box-shadow: 0 8px 32px rgba(99,102,241,0.35); }
        .auth-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
        .auth-error { background: rgba(255,107,107,0.08); border: 1px solid rgba(255,107,107,0.2); border-radius: 8px; padding: 10px 14px; font-family: 'DM Mono', monospace; font-size: 11px; color: #FF6B6B; margin-top: 12px; }
        .auth-success { background: rgba(29,158,117,0.08); border: 1px solid rgba(29,158,117,0.2); border-radius: 8px; padding: 10px 14px; font-family: 'DM Mono', monospace; font-size: 11px; color: #1D9E75; margin-top: 12px; }
        .spinner { width: 14px; height: 14px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; animation: spin 0.7s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
      <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="modal">
          <button className="modal-close" onClick={onClose}>×</button>
          <div className="modal-title">Welcome to Datyra</div>
          <div className="modal-sub">// Sign in to analyze your documents</div>
          <div className="mode-tabs">
            <button className={`mode-tab${mode === 'login' ? ' active' : ''}`} onClick={() => { setMode('login'); setError(''); setSuccess('') }}>Sign In</button>
            <button className={`mode-tab${mode === 'signup' ? ' active' : ''}`} onClick={() => { setMode('signup'); setError(''); setSuccess('') }}>Create Account</button>
          </div>
          <div className="field">
            <label>Email</label>
            <input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
          </div>
          <button className="auth-btn" onClick={handleSubmit} disabled={loading}>
            {loading ? <><div className="spinner" /> {mode === 'login' ? 'Signing in...' : 'Creating account...'}</> : mode === 'login' ? '→ Sign In' : '→ Create Account'}
          </button>
          {error && <div className="auth-error">⚠ {error}</div>}
          {success && <div className="auth-success">✓ {success}</div>}
        </div>
      </div>
    </>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Home() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [verifyResult, setVerifyResult] = useState<any>(null)
  const [showAuth, setShowAuth] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [chatMessages, setChatMessages] = useState<{role: 'user'|'assistant', text: string}[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [emailSending, setEmailSending] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Restore session on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
      setAuthLoading(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setResult(null)
    setFile(null)
    setVerifyResult(null)
    setChatMessages([])
    setEmailSent(false)
  }

  const handleSendReport = async () => {
    if (!result?.doc_id || !user?.email || emailSending) return
    setEmailSending(true)
    try {
      const res = await fetch(`https://datyra-production.up.railway.app/send-report/${result.doc_id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email })
      })
      const data = await res.json()
      if (data.sent) setEmailSent(true)
    } catch {
      // fail silently — button resets
    }
    setEmailSending(false)
  }

  const handleChat = async () => {
    if (!chatInput.trim() || !result?.doc_id || chatLoading) return
    const question = chatInput.trim()
    setChatInput('')
    setChatMessages(prev => [...prev, { role: 'user', text: question }])
    setChatLoading(true)
    try {
      const res = await fetch(`https://datyra-production.up.railway.app/chat/${result.doc_id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question })
      })
      const data = await res.json()
      setChatMessages(prev => [...prev, { role: 'assistant', text: data.answer }])
    } catch {
      setChatMessages(prev => [...prev, { role: 'assistant', text: 'Chat failed. Please try again.' }])
    }
    setChatLoading(false)
  }

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  const handleUpload = async () => {
    if (!file) return
    if (!user) { setShowAuth(true); return }
    setLoading(true)
    setError('')
    setResult(null)
    setVerifyResult(null)
    setEmailSent(false)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('user_id', user.id)
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()
      setResult(data)
    } catch (e) {
      setError('Upload failed. Make sure backend is running.')
    }
    setLoading(false)
  }

  const handleVerify = async () => {
    if (!result?.hash) return
    setVerifying(true)
    try {
      const res = await fetch(`https://datyra-production.up.railway.app/verify/${result.hash}`)
      const data = await res.json()
      setVerifyResult(data)
    } catch (e) {
      setVerifyResult({ verified: false, error: 'Verification failed' })
    }
    setVerifying(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) setFile(f)
  }

  const typeConfig: any = {
    MEDICAL: { color: '#FF6B6B', bg: 'rgba(255,107,107,0.1)', icon: '🩺', label: 'Medical' },
    LEGAL: { color: '#4ECDC4', bg: 'rgba(78,205,196,0.1)', icon: '⚖️', label: 'Legal' },
    FINANCIAL: { color: '#FFE66D', bg: 'rgba(255,230,109,0.1)', icon: '💰', label: 'Financial' },
  }
  const cfg = result ? (typeConfig[result.doc_type] || typeConfig.FINANCIAL) : null

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Mono:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0a0a0f; color: #e8e6e0; font-family: 'Syne', sans-serif; min-height: 100vh; }
        .noise { position: fixed; inset: 0; pointer-events: none; z-index: 0; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E"); opacity: 0.4; }
        .grid-bg { position: fixed; inset: 0; pointer-events: none; z-index: 0; background-image: linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px); background-size: 64px 64px; }
        .glow-orb { position: fixed; border-radius: 50%; filter: blur(120px); pointer-events: none; z-index: 0; }
        .wrap { position: relative; z-index: 1; max-width: 760px; margin: 0 auto; padding: 48px 24px 80px; }

        /* ── Header ── */
        .header { margin-bottom: 56px; }
        .header-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
        .logo { display: flex; align-items: center; gap: 12px; }
        .logo-mark { width: 40px; height: 40px; border-radius: 10px; background: linear-gradient(135deg, #6366f1, #8b5cf6); display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0; }
        .logo-text { font-size: 28px; font-weight: 800; letter-spacing: -0.5px; background: linear-gradient(90deg, #e8e6e0, #a09fad); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .tagline { font-family: 'DM Mono', monospace; font-size: 13px; color: #6b6a75; letter-spacing: 0.02em; }
        .pills { display: flex; gap: 8px; margin-top: 20px; flex-wrap: wrap; }
        .pill { padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; border: 1px solid; font-family: 'DM Mono', monospace; }

        /* ── Auth area ── */
        .auth-area { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
        .user-chip { display: flex; align-items: center; gap: 8px; background: rgba(99,102,241,0.08); border: 1px solid rgba(99,102,241,0.2); border-radius: 20px; padding: 6px 12px 6px 8px; }
        .user-avatar { width: 24px; height: 24px; border-radius: 50%; background: linear-gradient(135deg, #6366f1, #8b5cf6); display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; color: white; flex-shrink: 0; }
        .user-email { font-family: 'DM Mono', monospace; font-size: 11px; color: #a09fad; max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .sign-in-btn { padding: 8px 18px; background: linear-gradient(135deg, #6366f1, #8b5cf6); border: none; border-radius: 20px; color: white; font-family: 'Syne', sans-serif; font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.2s; white-space: nowrap; }
        .sign-in-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 20px rgba(99,102,241,0.4); }
        .sign-out-btn { padding: 6px 12px; background: transparent; border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; color: #6b6a75; font-family: 'DM Mono', monospace; font-size: 11px; cursor: pointer; transition: all 0.2s; white-space: nowrap; }
        .sign-out-btn:hover { border-color: rgba(255,107,107,0.3); color: #FF6B6B; background: rgba(255,107,107,0.05); }

        /* ── Auth gate ── */
        .auth-gate { border: 1.5px dashed rgba(99,102,241,0.2); border-radius: 20px; padding: 48px 32px; text-align: center; background: rgba(99,102,241,0.02); margin-bottom: 16px; }
        .auth-gate-icon { font-size: 36px; margin-bottom: 16px; }
        .auth-gate-title { font-size: 17px; font-weight: 600; color: #e8e6e0; margin-bottom: 8px; }
        .auth-gate-sub { font-family: 'DM Mono', monospace; font-size: 12px; color: #6b6a75; margin-bottom: 20px; }
        .auth-gate-btn { padding: 12px 28px; background: linear-gradient(135deg, #6366f1, #8b5cf6); border: none; border-radius: 12px; color: white; font-family: 'Syne', sans-serif; font-size: 14px; font-weight: 700; cursor: pointer; transition: all 0.2s; }
        .auth-gate-btn:hover { transform: translateY(-1px); box-shadow: 0 8px 32px rgba(99,102,241,0.35); }

        /* ── Upload ── */
        .upload-zone { border: 1.5px dashed rgba(255,255,255,0.1); border-radius: 20px; padding: 56px 32px; text-align: center; cursor: pointer; transition: all 0.3s ease; background: rgba(255,255,255,0.02); margin-bottom: 16px; position: relative; overflow: hidden; }
        .upload-zone::before { content: ''; position: absolute; inset: 0; background: radial-gradient(ellipse at center, rgba(99,102,241,0.06) 0%, transparent 70%); opacity: 0; transition: opacity 0.3s; }
        .upload-zone:hover::before, .upload-zone.drag { opacity: 1; }
        .upload-zone:hover, .upload-zone.drag { border-color: rgba(99,102,241,0.4); background: rgba(99,102,241,0.04); }
        .upload-icon { width: 56px; height: 56px; margin: 0 auto 20px; background: rgba(99,102,241,0.15); border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 24px; border: 1px solid rgba(99,102,241,0.2); }
        .upload-title { font-size: 17px; font-weight: 600; color: #e8e6e0; margin-bottom: 8px; }
        .upload-sub { font-family: 'DM Mono', monospace; font-size: 12px; color: #6b6a75; }
        .file-selected { display: flex; align-items: center; gap: 12px; background: rgba(99,102,241,0.08); border: 1px solid rgba(99,102,241,0.2); border-radius: 12px; padding: 12px 16px; margin-bottom: 16px; }
        .file-icon { width: 36px; height: 36px; border-radius: 8px; background: rgba(99,102,241,0.15); display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; }
        .file-name { font-size: 14px; font-weight: 600; color: #e8e6e0; }
        .file-size { font-family: 'DM Mono', monospace; font-size: 11px; color: #6b6a75; }
        .btn { width: 100%; padding: 16px; background: linear-gradient(135deg, #6366f1, #8b5cf6); border: none; border-radius: 14px; color: white; font-family: 'Syne', sans-serif; font-size: 15px; font-weight: 700; letter-spacing: 0.02em; cursor: pointer; transition: all 0.2s; position: relative; overflow: hidden; }
        .btn:hover { transform: translateY(-1px); box-shadow: 0 8px 32px rgba(99,102,241,0.35); }
        .btn:active { transform: translateY(0); }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
        .btn-inner { display: flex; align-items: center; justify-content: center; gap: 8px; }

        /* ── Verify ── */
        .verify-btn { padding: 10px 20px; background: transparent; border: 1px solid rgba(99,102,241,0.4); border-radius: 10px; color: #6366f1; font-family: 'DM Mono', monospace; font-size: 12px; font-weight: 500; cursor: pointer; transition: all 0.2s; margin-top: 10px; display: flex; align-items: center; gap: 6px; }
        .verify-btn:hover { background: rgba(99,102,241,0.1); }
        .verify-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        /* ── Spinners ── */
        .spinner { width: 16px; height: 16px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; animation: spin 0.7s linear infinite; }
        .spinner-sm { width: 12px; height: 12px; border-radius: 50%; border: 1.5px solid rgba(99,102,241,0.3); border-top-color: #6366f1; animation: spin 0.7s linear infinite; display: inline-block; }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* ── Error ── */
        .error-box { background: rgba(255,107,107,0.08); border: 1px solid rgba(255,107,107,0.2); border-radius: 10px; padding: 12px 16px; font-family: 'DM Mono', monospace; font-size: 12px; color: #FF6B6B; margin-top: 12px; }

        /* ── Results ── */
        .results { margin-top: 32px; animation: fadeUp 0.5s ease; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        .results-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
        .results-title { font-size: 20px; font-weight: 700; }
        .type-badge { display: flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; font-family: 'DM Mono', monospace; border: 1px solid; }
        .card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 16px; padding: 20px 24px; margin-bottom: 12px; }
        .card-label { font-family: 'DM Mono', monospace; font-size: 10px; color: #6b6a75; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 8px; }
        .card-value { font-size: 14px; color: #e8e6e0; line-height: 1.6; }
        .hash-value { font-family: 'DM Mono', monospace; font-size: 11px; color: #a09fad; background: rgba(255,255,255,0.04); padding: 10px 14px; border-radius: 8px; word-break: break-all; line-height: 1.6; border: 1px solid rgba(255,255,255,0.06); }
        .points-list { list-style: none; }
        .points-list li { display: flex; gap: 10px; align-items: flex-start; font-size: 13px; color: #c4c2cc; line-height: 1.6; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.04); }
        .points-list li:last-child { border-bottom: none; }
        .points-list li::before { content: '→'; color: #6366f1; font-family: 'DM Mono', monospace; font-size: 12px; flex-shrink: 0; margin-top: 2px; }
        .med-tags { display: flex; flex-wrap: wrap; gap: 6px; }
        .med-tag { padding: 4px 12px; border-radius: 20px; background: rgba(255,107,107,0.1); color: #FF6B6B; font-size: 12px; font-weight: 600; border: 1px solid rgba(255,107,107,0.2); }
        .storage-link { font-family: 'DM Mono', monospace; font-size: 11px; color: #6366f1; word-break: break-all; line-height: 1.6; text-decoration: none; }
        .storage-link:hover { color: #8b5cf6; }
        .stats-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
        .stat-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 12px; padding: 16px 18px; }
        .stat-num { font-size: 22px; font-weight: 800; background: linear-gradient(90deg, #6366f1, #8b5cf6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-family: 'DM Mono', monospace; }
        .stat-label { font-size: 11px; color: #6b6a75; margin-top: 2px; font-family: 'DM Mono', monospace; letter-spacing: 0.06em; }
        .verified-yes { display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; font-family: 'DM Mono', monospace; background: rgba(29,158,117,0.15); color: #1D9E75; border: 1px solid rgba(29,158,117,0.3); }
        .verified-no { display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; font-family: 'DM Mono', monospace; background: rgba(255,107,107,0.1); color: #FF6B6B; border: 1px solid rgba(255,107,107,0.2); }

        /* ── Chat ── */
        .chat-panel { border-radius: 16px; border: 1px solid rgba(99,102,241,0.25); background: rgba(99,102,241,0.03); margin-bottom: 12px; overflow: hidden; }
        .chat-header { padding: 16px 20px; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; align-items: center; gap: 10px; }
        .chat-dot { width: 8px; height: 8px; border-radius: 50%; background: #6366f1; box-shadow: 0 0 8px #6366f1; animation: pulse 2s infinite; }
        @keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.4 } }
        .chat-title { font-size: 13px; font-weight: 700; color: #e8e6e0; }
        .chat-sub { font-family: 'DM Mono', monospace; font-size: 10px; color: #6b6a75; margin-left: auto; }
        .chat-messages { padding: 16px 20px; max-height: 320px; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; }
        .chat-messages::-webkit-scrollbar { width: 4px; }
        .chat-messages::-webkit-scrollbar-track { background: transparent; }
        .chat-messages::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }
        .msg-user { align-self: flex-end; background: rgba(99,102,241,0.15); border: 1px solid rgba(99,102,241,0.25); border-radius: 12px 12px 4px 12px; padding: 10px 14px; max-width: 80%; font-size: 13px; color: #e8e6e0; line-height: 1.5; }
        .msg-assistant { align-self: flex-start; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07); border-radius: 12px 12px 12px 4px; padding: 10px 14px; max-width: 90%; font-size: 13px; color: #c4c2cc; line-height: 1.6; font-family: 'DM Mono', monospace; }
        .chat-empty { text-align: center; padding: 24px; font-family: 'DM Mono', monospace; font-size: 12px; color: #3d3c47; }
        .chat-input-row { display: flex; gap: 8px; padding: 12px 16px; border-top: 1px solid rgba(255,255,255,0.05); }
        .chat-input { flex: 1; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 10px 14px; color: #e8e6e0; font-family: 'DM Mono', monospace; font-size: 12px; outline: none; transition: border-color 0.2s; }
        .chat-input:focus { border-color: rgba(99,102,241,0.4); }
        .chat-input::placeholder { color: #3d3c47; }
        .chat-send { padding: 10px 16px; background: linear-gradient(135deg, #6366f1, #8b5cf6); border: none; border-radius: 10px; color: white; font-size: 14px; cursor: pointer; transition: all 0.2s; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
        .chat-send:hover { transform: translateY(-1px); box-shadow: 0 4px 16px rgba(99,102,241,0.4); }
        .chat-send:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
        .drug-card { border-radius: 16px; padding: 20px 24px; margin-bottom: 12px; border: 1px solid; }
        .severity-high { background: rgba(255,107,107,0.06); border-color: rgba(255,107,107,0.25); }
        .severity-medium { background: rgba(255,190,50,0.06); border-color: rgba(255,190,50,0.25); }
        .severity-low { background: rgba(29,158,117,0.06); border-color: rgba(29,158,117,0.2); }
        .severity-badge { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 20px; font-size: 10px; font-weight: 700; letter-spacing: 0.08em; font-family: 'DM Mono', monospace; margin-left: 8px; }
        .badge-high { background: rgba(255,107,107,0.15); color: #FF6B6B; border: 1px solid rgba(255,107,107,0.3); }
        .badge-medium { background: rgba(255,190,50,0.15); color: #FFBE32; border: 1px solid rgba(255,190,50,0.3); }
        .badge-low { background: rgba(29,158,117,0.15); color: #1D9E75; border: 1px solid rgba(29,158,117,0.3); }
        .interaction-note { font-family: 'DM Mono', monospace; font-size: 11px; color: #a09fad; line-height: 1.6; padding: 8px 12px; background: rgba(0,0,0,0.2); border-radius: 8px; margin-top: 8px; }
        .email-btn { display:flex;align-items:center;gap:8px;padding:11px 20px;background:transparent;border:1px solid rgba(99,102,241,0.3);border-radius:10px;color:#6366f1;font-family:'DM Mono',monospace;font-size:12px;font-weight:500;cursor:pointer;transition:all 0.2s;width:100%; }
        .email-btn:hover:not(:disabled) { background:rgba(99,102,241,0.08);border-color:rgba(99,102,241,0.5); }
        .email-btn:disabled { opacity:0.5;cursor:not-allowed; }
        .email-btn.sent { border-color:rgba(29,158,117,0.4);color:#1D9E75;background:rgba(29,158,117,0.06);cursor:default; }
      `}</style>

      <div className="noise" />
      <div className="grid-bg" />
      <div className="glow-orb" style={{ width: 600, height: 600, top: -200, left: -200, background: 'rgba(99,102,241,0.08)' }} />
      <div className="glow-orb" style={{ width: 400, height: 400, bottom: -100, right: -100, background: 'rgba(139,92,246,0.06)' }} />

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} onAuth={setUser} />}

      <div className="wrap">
        <div className="header">
          <div className="header-top">
            <div className="logo">
              <div className="logo-mark">⬡</div>
              <span className="logo-text">Datyra</span>
            </div>

            {/* Auth area */}
            <div className="auth-area">
              {authLoading ? (
                <span className="spinner-sm" />
              ) : user ? (
                <>
                  <a href="/documents" style={{ padding: '8px 14px', background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', color: '#a09fad', fontFamily: 'DM Mono, monospace', fontSize: '11px', textDecoration: 'none', transition: 'all 0.2s', whiteSpace: 'nowrap' }}
                    onMouseOver={e => { (e.target as any).style.borderColor='rgba(99,102,241,0.3)'; (e.target as any).style.color='#6366f1' }}
                    onMouseOut={e => { (e.target as any).style.borderColor='rgba(255,255,255,0.08)'; (e.target as any).style.color='#a09fad' }}>
                    My Docs
                  </a>
                  <div className="user-chip">
                    <div className="user-avatar">{user.email?.[0]?.toUpperCase()}</div>
                    <span className="user-email">{user.email}</span>
                  </div>
                  <button className="sign-out-btn" onClick={handleSignOut}>Sign out</button>
                </>
              ) : (
                <button className="sign-in-btn" onClick={() => setShowAuth(true)}>Sign In →</button>
              )}
            </div>
          </div>

          <p className="tagline">// AI-powered document intelligence + blockchain verification</p>
          <div className="pills">
            {['OCR Engine', 'AI Classification', 'Blockchain Hash', 'Supabase Storage'].map(p => (
              <span key={p} className="pill" style={{ borderColor: 'rgba(99,102,241,0.3)', color: '#6366f1' }}>{p}</span>
            ))}
          </div>
        </div>

        {/* If not logged in, show auth gate instead of upload */}
        {!user && !authLoading ? (
          <div className="auth-gate">
            <div className="auth-gate-icon">🔐</div>
            <div className="auth-gate-title">Sign in to analyze documents</div>
            <div className="auth-gate-sub">// Your documents are private and tied to your account</div>
            <button className="auth-gate-btn" onClick={() => setShowAuth(true)}>Get Started →</button>
          </div>
        ) : (
          <>
            <div
              className={`upload-zone${dragOver ? ' drag' : ''}`}
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <div className="upload-icon">📂</div>
              <div className="upload-title">Drop your document here</div>
              <div className="upload-sub">PDF · PNG · JPG · JPEG — Medical, Legal, Financial</div>
              <input ref={inputRef} type="file" accept=".pdf,.png,.jpg,.jpeg" style={{ display: 'none' }}
                onChange={(e) => setFile(e.target.files?.[0] || null)} />
            </div>

            {file && (
              <div className="file-selected">
                <div className="file-icon">📄</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="file-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</div>
                  <div className="file-size">{(file.size / 1024).toFixed(1)} KB</div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); setFile(null); setResult(null); setVerifyResult(null) }}
                  style={{ background: 'none', border: 'none', color: '#6b6a75', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</button>
              </div>
            )}

            <button className="btn" onClick={handleUpload} disabled={!file || loading}>
              <div className="btn-inner">
                {loading ? <><div className="spinner" /> Analyzing...</> : <>⚡ Analyze Document</>}
              </div>
            </button>
          </>
        )}

        {error && <div className="error-box">⚠ {error}</div>}

        {result && cfg && (
          <div className="results">
            <div className="results-header">
              <div className="results-title">Analysis Complete</div>
              <div className="type-badge" style={{ color: cfg.color, borderColor: cfg.color + '40', background: cfg.bg }}>
                <span>{cfg.icon}</span> {cfg.label}
              </div>
            </div>

            {/* ── Send Report Email Button ── */}
            <button
              className={`email-btn${emailSent ? ' sent' : ''}`}
              onClick={handleSendReport}
              disabled={emailSending || emailSent}
            >
              {emailSent
                ? <><span>✓</span> Report sent to {user?.email}</>
                : emailSending
                  ? <><span className="spinner-sm" /> Sending report...</>
                  : <><span>✉</span> Send Report to {user?.email}</>
              }
            </button>

            <div className="stats-row">
              <div className="stat-card">
                <div className="stat-num">{result.insights?.key_points?.length || 0}</div>
                <div className="stat-label">KEY POINTS</div>
              </div>
              <div className="stat-card">
                <div className="stat-num">{result.insights?.medicines?.length || 0}</div>
                <div className="stat-label">MEDICINES FOUND</div>
              </div>
            </div>

            {/* ── RAG Chat Panel ── */}
            {result.doc_id && (
              <div className="chat-panel">
                <div className="chat-header">
                  <div className="chat-dot" />
                  <span className="chat-title">Chat with this Document</span>
                  <span className="chat-sub">powered by Pinecone + Claude</span>
                </div>
                <div className="chat-messages">
                  {chatMessages.length === 0 && (
                    <div className="chat-empty">Ask anything about this document...</div>
                  )}
                  {chatMessages.map((msg, i) => (
                    msg.text ? (
                      <div key={i} className={msg.role === 'user' ? 'msg-user' : 'msg-assistant'}>
                        {msg.text}
                      </div>
                    ) : null
                  ))}
                  {chatLoading && (
                    <div className="msg-assistant" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="spinner-sm" /> Thinking...
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
                <div className="chat-input-row">
                  <input
                    className="chat-input"
                    placeholder="e.g. What medicines are mentioned? What are the key clauses?"
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleChat()}
                    disabled={chatLoading}
                  />
                  <button className="chat-send" onClick={handleChat} disabled={chatLoading || !chatInput.trim()}>
                    ↑
                  </button>
                </div>
              </div>
            )}

            {result.insights?.summary && (
              <div className="card">
                <div className="card-label">AI Summary</div>
                <div className="card-value">{result.insights.summary}</div>
              </div>
            )}

            {result.insights?.key_points?.length > 0 && (
              <div className="card">
                <div className="card-label">Key Points</div>
                <ul className="points-list">
                  {result.insights.key_points.map((p: string, i: number) => <li key={i}>{p}</li>)}
                </ul>
              </div>
            )}

            {result.insights?.medicines?.length > 0 && (
              <div className="card">
                <div className="card-label">Medicines Detected</div>
                <div className="med-tags" style={{ marginTop: 4 }}>
                  {result.insights.medicines.map((m: string, i: number) => <span key={i} className="med-tag">{m}</span>)}
                </div>
              </div>
            )}

            {/* ── Drug Interactions ── */}
            {result.drug_interactions?.checked && (
              <div className="card" style={{ borderColor: 'rgba(255,107,107,0.2)', background: 'rgba(255,107,107,0.03)' }}>
                <div className="card-label" style={{ color: '#FF6B6B' }}>Drug Interaction Analysis — OpenFDA</div>

                {result.drug_interactions.pairwise_interactions?.length > 0 ? (
                  result.drug_interactions.pairwise_interactions.map((interaction: any, i: number) => (
                    <div key={i} className={`drug-card severity-${interaction.severity.toLowerCase()}`} style={{ marginTop: i === 0 ? 12 : 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#e8e6e0' }}>
                          {interaction.pair[0]}
                        </span>
                        <span style={{ fontSize: 11, color: '#6b6a75', fontFamily: 'DM Mono, monospace' }}>+</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#e8e6e0' }}>
                          {interaction.pair[1]}
                        </span>
                        <span className={`severity-badge badge-${interaction.severity.toLowerCase()}`}>
                          {interaction.severity}
                        </span>
                      </div>
                      {interaction.notes?.slice(0, 1).map((note: string, j: number) => (
                        <div key={j} className="interaction-note">{note}</div>
                      ))}
                    </div>
                  ))
                ) : result.drug_interactions.individual_warnings?.length > 0 ? (
                  <div style={{ marginTop: 10 }}>
                    {result.drug_interactions.individual_warnings.map((w: any, i: number) => (
                      <div key={i} className={`drug-card severity-${w.severity.toLowerCase()}`} style={{ marginBottom: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#e8e6e0' }}>{w.medicine}</span>
                          <span className={`severity-badge badge-${w.severity.toLowerCase()}`}>{w.severity}</span>
                        </div>
                        {w.warnings?.slice(0, 1).map((warn: string, j: number) => (
                          <div key={j} className="interaction-note">{warn}</div>
                        ))}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ marginTop: 10, fontSize: 13, color: '#6b6a75', fontFamily: 'DM Mono, monospace' }}>
                    ✓ No significant interactions found between detected medicines.
                  </div>
                )}
              </div>
            )}

            <div className="card">
              <div className="card-label">SHA-256 Hash</div>
              <div className="hash-value">{result.hash}</div>
            </div>

            <div className="card">
              <div className="card-label">Supabase Storage URL</div>
              <a href={result.storage_url} target="_blank" className="storage-link">{result.storage_url}</a>
            </div>

            <div className="card" style={{ borderColor: 'rgba(99,102,241,0.2)', background: 'rgba(99,102,241,0.04)' }}>
              <div className="card-label" style={{ color: '#6366f1' }}>Blockchain Verification — Polygon Amoy</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#1D9E75', boxShadow: '0 0 8px #1D9E75' }} />
                <span style={{ fontSize: 12, color: '#a09fad', fontFamily: 'DM Mono, monospace' }}>
                  Hash stored on-chain · {result.hash?.slice(0, 20)}...
                </span>
              </div>

              {verifyResult ? (
                <div style={{ marginTop: 12 }}>
                  <span className={verifyResult.verified ? 'verified-yes' : 'verified-no'}>
                    {verifyResult.verified ? '✓ Document Verified on Blockchain' : '✗ Not Found on Chain'}
                  </span>
                  {verifyResult.verified && verifyResult.timestamp > 0 && (
                    <div style={{ marginTop: 8, fontSize: 11, color: '#6b6a75', fontFamily: 'DM Mono, monospace' }}>
                      Stored at: {new Date(verifyResult.timestamp * 1000).toLocaleString()}
                    </div>
                  )}
                </div>
              ) : (
                <button className="verify-btn" onClick={handleVerify} disabled={verifying}>
                  {verifying ? <><span className="spinner-sm" /> Verifying...</> : <>⛓ Verify on Polygon</>}
                </button>
              )}

              <a
                href="https://amoy.polygonscan.com/address/0x4a7F08641df663e2b75e36052E2adC6B47e3081c"
                target="_blank"
                style={{ fontSize: 11, color: '#6366f1', fontFamily: 'DM Mono, monospace', marginTop: 10, display: 'block', textDecoration: 'none' }}
              >
                View smart contract on PolygonScan ↗
              </a>
            </div>
          </div>
        )}
      </div>
    </>
  )
}