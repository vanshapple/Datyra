'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter, useParams } from 'next/navigation'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const typeConfig: any = {
  MEDICAL:   { color: '#FF6B6B', bg: 'rgba(255,107,107,0.1)',  icon: '🩺', label: 'Medical' },
  LEGAL:     { color: '#4ECDC4', bg: 'rgba(78,205,196,0.1)',   icon: '⚖️', label: 'Legal' },
  FINANCIAL: { color: '#FFE66D', bg: 'rgba(255,230,109,0.1)',  icon: '💰', label: 'Financial' },
}

export default function DocumentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const docId = params.id as string

  const [doc, setDoc] = useState<any>(null)
  const [insights, setInsights] = useState<any>({})
  const [interactions, setInteractions] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [verifyResult, setVerifyResult] = useState<any>(null)
  const [verifying, setVerifying] = useState(false)
  const [chatMessages, setChatMessages] = useState<{role:'user'|'assistant', text:string}[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session?.user) { router.push('/'); return }
      fetchDocument()
    })
  }, [docId])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  const fetchDocument = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('documents')
      .select('*, insights(*), drug_interactions(*)')
      .eq('id', docId)
      .single()
    if (data) {
      setDoc(data)
      const ins = data.insights?.[0]?.extracted_json || {}
      ins.summary = ins.summary || data.insights?.[0]?.summary || ''
      setInsights(ins)
      if (data.drug_interactions?.length > 0) setInteractions(data.drug_interactions[0])
    }
    setLoading(false)
  }

  const handleVerify = async () => {
    if (!doc?.hash) return
    setVerifying(true)
    try {
      const res = await fetch(`https://datyra-production.up.railway.app/verify/${doc.hash}`)
      setVerifyResult(await res.json())
    } catch { setVerifyResult({ verified: false, error: 'Failed' }) }
    setVerifying(false)
  }

  const handleChat = async () => {
    if (!chatInput.trim() || chatLoading) return
    const question = chatInput.trim()
    setChatInput('')
    setChatMessages(prev => [...prev, { role: 'user', text: question }])
    setChatLoading(true)
    try {
      const res = await fetch(`https://datyra-production.up.railway.app/chat/${docId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question })
      })
      const data = await res.json()
      setChatMessages(prev => [...prev, { role: 'assistant', text: data.answer || 'No response.' }])
    } catch {
      setChatMessages(prev => [...prev, { role: 'assistant', text: 'Chat failed. Please try again.' }])
    }
    setChatLoading(false)
  }

  const formatDate = (ts: string) => new Date(ts).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
  })

  if (loading) return (
    <div style={{ background: '#0a0a0f', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid rgba(99,102,241,0.3)', borderTopColor: '#6366f1', animation: 'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  if (!doc) return (
    <div style={{ background: '#0a0a0f', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <div style={{ fontSize: 48 }}>🔍</div>
      <div style={{ color: '#e8e6e0', fontSize: 18, fontFamily: 'Syne, sans-serif', fontWeight: 700 }}>Document not found</div>
      <a href="/documents" style={{ color: '#6366f1', fontFamily: 'DM Mono, monospace', fontSize: 12, textDecoration: 'none' }}>← Back to documents</a>
    </div>
  )

  const cfg = typeConfig[doc.doc_type] || typeConfig.FINANCIAL

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
        .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 40px; }
        .logo { display: flex; align-items: center; gap: 10px; text-decoration: none; }
        .logo-mark { width: 36px; height: 36px; border-radius: 9px; background: linear-gradient(135deg, #6366f1, #8b5cf6); display: flex; align-items: center; justify-content: center; font-size: 18px; }
        .logo-text { font-size: 22px; font-weight: 800; background: linear-gradient(90deg, #e8e6e0, #a09fad); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .back-btn { display: flex; align-items: center; gap: 6px; padding: 8px 16px; background: transparent; border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; color: #6b6a75; font-family: 'DM Mono', monospace; font-size: 12px; cursor: pointer; transition: all 0.2s; text-decoration: none; }
        .back-btn:hover { border-color: rgba(99,102,241,0.3); color: #6366f1; }
        .doc-title-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 8px; flex-wrap: wrap; }
        .doc-title { font-size: 24px; font-weight: 800; color: #e8e6e0; word-break: break-word; }
        .type-badge { display: flex; align-items: center; gap: 5px; padding: 5px 14px; border-radius: 20px; font-size: 12px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; font-family: 'DM Mono', monospace; border: 1px solid; white-space: nowrap; flex-shrink: 0; }
        .doc-date { font-family: 'DM Mono', monospace; font-size: 12px; color: #6b6a75; margin-bottom: 32px; }
        .card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 16px; padding: 20px 24px; margin-bottom: 12px; animation: fadeUp 0.4s ease both; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .card-label { font-family: 'DM Mono', monospace; font-size: 10px; color: #6b6a75; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 10px; }
        .card-value { font-size: 14px; color: #e8e6e0; line-height: 1.6; }
        .points-list { list-style: none; }
        .points-list li { display: flex; gap: 10px; align-items: flex-start; font-size: 13px; color: #c4c2cc; line-height: 1.6; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.04); }
        .points-list li:last-child { border-bottom: none; }
        .points-list li::before { content: '→'; color: #6366f1; font-family: 'DM Mono', monospace; font-size: 12px; flex-shrink: 0; margin-top: 2px; }
        .med-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; }
        .med-tag { padding: 4px 12px; border-radius: 20px; background: rgba(255,107,107,0.1); color: #FF6B6B; font-size: 12px; font-weight: 600; border: 1px solid rgba(255,107,107,0.2); }
        .hash-value { font-family: 'DM Mono', monospace; font-size: 11px; color: #a09fad; background: rgba(255,255,255,0.04); padding: 10px 14px; border-radius: 8px; word-break: break-all; line-height: 1.6; border: 1px solid rgba(255,255,255,0.06); }
        .storage-link { font-family: 'DM Mono', monospace; font-size: 11px; color: #6366f1; word-break: break-all; line-height: 1.6; text-decoration: none; }
        .storage-link:hover { color: #8b5cf6; }
        .verify-btn { padding: 10px 20px; background: transparent; border: 1px solid rgba(99,102,241,0.4); border-radius: 10px; color: #6366f1; font-family: 'DM Mono', monospace; font-size: 12px; cursor: pointer; transition: all 0.2s; margin-top: 10px; display: flex; align-items: center; gap: 6px; }
        .verify-btn:hover { background: rgba(99,102,241,0.1); }
        .verified-yes { display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; font-family: 'DM Mono', monospace; background: rgba(29,158,117,0.15); color: #1D9E75; border: 1px solid rgba(29,158,117,0.3); }
        .verified-no { display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; font-family: 'DM Mono', monospace; background: rgba(255,107,107,0.1); color: #FF6B6B; border: 1px solid rgba(255,107,107,0.2); }
        .drug-warning { background: rgba(255,107,107,0.06); border: 1px solid rgba(255,107,107,0.2); border-radius: 10px; padding: 12px 16px; margin-bottom: 8px; font-family: 'DM Mono', monospace; font-size: 11px; color: #a09fad; line-height: 1.6; }
        .spinner { width: 16px; height: 16px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; animation: spin 0.7s linear infinite; }
        .spinner-sm { width: 12px; height: 12px; border-radius: 50%; border: 1.5px solid rgba(99,102,241,0.3); border-top-color: #6366f1; animation: spin 0.7s linear infinite; display: inline-block; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .chat-panel { border-radius: 16px; border: 1px solid rgba(99,102,241,0.25); background: rgba(99,102,241,0.03); margin-bottom: 12px; overflow: hidden; }
        .chat-header { padding: 16px 20px; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; align-items: center; gap: 10px; }
        .chat-dot { width: 8px; height: 8px; border-radius: 50%; background: #6366f1; box-shadow: 0 0 8px #6366f1; animation: pulse 2s infinite; }
        @keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.4 } }
        .chat-messages { padding: 16px 20px; max-height: 320px; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; }
        .chat-messages::-webkit-scrollbar { width: 4px; }
        .chat-messages::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }
        .msg-user { align-self: flex-end; background: rgba(99,102,241,0.15); border: 1px solid rgba(99,102,241,0.25); border-radius: 12px 12px 4px 12px; padding: 10px 14px; max-width: 80%; font-size: 13px; color: #e8e6e0; line-height: 1.5; }
        .msg-assistant { align-self: flex-start; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07); border-radius: 12px 12px 12px 4px; padding: 10px 14px; max-width: 90%; font-size: 13px; color: #c4c2cc; line-height: 1.6; font-family: 'DM Mono', monospace; }
        .chat-empty { text-align: center; padding: 24px; font-family: 'DM Mono', monospace; font-size: 12px; color: #3d3c47; }
        .chat-input-row { display: flex; gap: 8px; padding: 12px 16px; border-top: 1px solid rgba(255,255,255,0.05); }
        .chat-input { flex: 1; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 10px 14px; color: #e8e6e0; font-family: 'DM Mono', monospace; font-size: 12px; outline: none; transition: border-color 0.2s; }
        .chat-input:focus { border-color: rgba(99,102,241,0.4); }
        .chat-input::placeholder { color: #3d3c47; }
        .chat-send { padding: 10px 16px; background: linear-gradient(135deg, #6366f1, #8b5cf6); border: none; border-radius: 10px; color: white; font-size: 14px; cursor: pointer; transition: all 0.2s; flex-shrink: 0; }
        .chat-send:hover { transform: translateY(-1px); }
        .chat-send:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
      `}</style>

      <div className="noise" />
      <div className="grid-bg" />
      <div className="glow-orb" style={{ width: 500, height: 500, top: -150, right: -150, background: 'rgba(99,102,241,0.07)' }} />

      <div className="wrap">
        <div className="header">
          <a href="/" className="logo">
            <div className="logo-mark">⬡</div>
            <span className="logo-text">Datyra</span>
          </a>
          <a href="/documents" className="back-btn">← My Documents</a>
        </div>

        <div className="doc-title-row">
          <div className="doc-title">{doc.filename}</div>
          <div className="type-badge" style={{ color: cfg.color, borderColor: cfg.color + '40', background: cfg.bg }}>
            <span>{cfg.icon}</span>{cfg.label}
          </div>
        </div>
        <div className="doc-date">Uploaded {formatDate(doc.uploaded_at)}</div>

        {/* Chat */}
        <div className="chat-panel" style={{ animationDelay: '0s' }}>
          <div className="chat-header">
            <div className="chat-dot" />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#e8e6e0' }}>Chat with this Document</span>
            <span style={{ fontSize: 10, color: '#6b6a75', fontFamily: 'DM Mono, monospace', marginLeft: 'auto' }}>powered by Pinecone + Claude</span>
          </div>
          <div className="chat-messages">
            {chatMessages.length === 0 && <div className="chat-empty">Ask anything about this document...</div>}
            {chatMessages.map((msg, i) => msg.text ? (
              <div key={i} className={msg.role === 'user' ? 'msg-user' : 'msg-assistant'}>{msg.text}</div>
            ) : null)}
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
              placeholder="Ask a question about this document..."
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleChat()}
              disabled={chatLoading}
            />
            <button className="chat-send" onClick={handleChat} disabled={chatLoading || !chatInput.trim()}>↑</button>
          </div>
        </div>

        {/* Summary */}
        {insights.summary && (
          <div className="card" style={{ animationDelay: '0.05s' }}>
            <div className="card-label">AI Summary</div>
            <div className="card-value">{insights.summary}</div>
          </div>
        )}

        {/* Key Points */}
        {insights.key_points?.length > 0 && (
          <div className="card" style={{ animationDelay: '0.1s' }}>
            <div className="card-label">Key Points</div>
            <ul className="points-list">
              {insights.key_points.map((p: string, i: number) => <li key={i}>{p}</li>)}
            </ul>
          </div>
        )}

        {/* Medicines */}
        {insights.medicines?.length > 0 && (
          <div className="card" style={{ animationDelay: '0.15s' }}>
            <div className="card-label">Medicines Detected</div>
            <div className="med-tags">
              {insights.medicines.map((m: string, i: number) => <span key={i} className="med-tag">{m}</span>)}
            </div>
          </div>
        )}

        {/* Drug Interactions */}
        {interactions?.warnings?.length > 0 && (
          <div className="card" style={{ borderColor: 'rgba(255,107,107,0.2)', background: 'rgba(255,107,107,0.03)', animationDelay: '0.2s' }}>
            <div className="card-label" style={{ color: '#FF6B6B' }}>⚠ Drug Interaction Warnings</div>
            {interactions.warnings.map((w: string, i: number) => (
              <div key={i} className="drug-warning">{w}</div>
            ))}
          </div>
        )}

        {/* Parties / Dates */}
        {insights.parties_involved?.length > 0 && (
          <div className="card" style={{ animationDelay: '0.2s' }}>
            <div className="card-label">Parties Involved</div>
            <div className="card-value">{insights.parties_involved.join(', ')}</div>
          </div>
        )}
        {insights.important_dates?.length > 0 && (
          <div className="card" style={{ animationDelay: '0.25s' }}>
            <div className="card-label">Important Dates</div>
            <div className="card-value">{insights.important_dates.join(', ')}</div>
          </div>
        )}

        {/* Hash */}
        <div className="card" style={{ animationDelay: '0.3s' }}>
          <div className="card-label">SHA-256 Hash</div>
          <div className="hash-value">{doc.hash}</div>
        </div>

        {/* Storage */}
        <div className="card" style={{ animationDelay: '0.35s' }}>
          <div className="card-label">Supabase Storage URL</div>
          <a href={doc.storage_url} target="_blank" className="storage-link">{doc.storage_url}</a>
        </div>

        {/* Blockchain */}
        <div className="card" style={{ borderColor: 'rgba(99,102,241,0.2)', background: 'rgba(99,102,241,0.04)', animationDelay: '0.4s' }}>
          <div className="card-label" style={{ color: '#6366f1' }}>Blockchain Verification — Polygon Amoy</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#1D9E75', boxShadow: '0 0 8px #1D9E75' }} />
            <span style={{ fontSize: 12, color: '#a09fad', fontFamily: 'DM Mono, monospace' }}>
              Hash stored on-chain · {doc.hash?.slice(0, 20)}...
            </span>
          </div>
          {verifyResult ? (
            <div style={{ marginTop: 12 }}>
              <span className={verifyResult.verified ? 'verified-yes' : 'verified-no'}>
                {verifyResult.verified ? '✓ Verified on Blockchain' : '✗ Not Found on Chain'}
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
          <a href="https://amoy.polygonscan.com/address/0x4a7F08641df663e2b75e36052E2adC6B47e3081c" target="_blank"
            style={{ fontSize: 11, color: '#6366f1', fontFamily: 'DM Mono, monospace', marginTop: 10, display: 'block', textDecoration: 'none' }}>
            View smart contract on PolygonScan ↗
          </a>
        </div>
      </div>
    </>
  )
}