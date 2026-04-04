'use client'
import { useState, useRef } from 'react'

export default function Home() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [verifyResult, setVerifyResult] = useState<any>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleUpload = async () => {
    if (!file) return
    setLoading(true)
    setError('')
    setResult(null)
    setVerifyResult(null)
    const formData = new FormData()
    formData.append('file', file)
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
        .header { margin-bottom: 56px; }
        .logo { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
        .logo-mark { width: 40px; height: 40px; border-radius: 10px; background: linear-gradient(135deg, #6366f1, #8b5cf6); display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0; }
        .logo-text { font-size: 28px; font-weight: 800; letter-spacing: -0.5px; background: linear-gradient(90deg, #e8e6e0, #a09fad); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .tagline { font-family: 'DM Mono', monospace; font-size: 13px; color: #6b6a75; letter-spacing: 0.02em; }
        .pills { display: flex; gap: 8px; margin-top: 20px; flex-wrap: wrap; }
        .pill { padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; border: 1px solid; font-family: 'DM Mono', monospace; }
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
        .verify-btn { padding: 10px 20px; background: transparent; border: 1px solid rgba(99,102,241,0.4); border-radius: 10px; color: #6366f1; font-family: 'DM Mono', monospace; font-size: 12px; font-weight: 500; cursor: pointer; transition: all 0.2s; margin-top: 10px; display: flex; align-items: center; gap: 6px; }
        .verify-btn:hover { background: rgba(99,102,241,0.1); }
        .verify-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .spinner { width: 16px; height: 16px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; animation: spin 0.7s linear infinite; }
        .spinner-sm { width: 12px; height: 12px; border-radius: 50%; border: 1.5px solid rgba(99,102,241,0.3); border-top-color: #6366f1; animation: spin 0.7s linear infinite; display: inline-block; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .error-box { background: rgba(255,107,107,0.08); border: 1px solid rgba(255,107,107,0.2); border-radius: 10px; padding: 12px 16px; font-family: 'DM Mono', monospace; font-size: 12px; color: #FF6B6B; margin-top: 12px; }
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
      `}</style>

      <div className="noise" />
      <div className="grid-bg" />
      <div className="glow-orb" style={{ width: 600, height: 600, top: -200, left: -200, background: 'rgba(99,102,241,0.08)' }} />
      <div className="glow-orb" style={{ width: 400, height: 400, bottom: -100, right: -100, background: 'rgba(139,92,246,0.06)' }} />

      <div className="wrap">
        <div className="header">
          <div className="logo">
            <div className="logo-mark">⬡</div>
            <span className="logo-text">Datyra</span>
          </div>
          <p className="tagline">// AI-powered document intelligence + blockchain verification</p>
          <div className="pills">
            {['OCR Engine', 'AI Classification', 'Blockchain Hash', 'Supabase Storage'].map(p => (
              <span key={p} className="pill" style={{ borderColor: 'rgba(99,102,241,0.3)', color: '#6366f1' }}>{p}</span>
            ))}
          </div>
        </div>

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

        {error && <div className="error-box">⚠ {error}</div>}

        {result && cfg && (
          <div className="results">
            <div className="results-header">
              <div className="results-title">Analysis Complete</div>
              <div className="type-badge" style={{ color: cfg.color, borderColor: cfg.color + '40', background: cfg.bg }}>
                <span>{cfg.icon}</span> {cfg.label}
              </div>
            </div>

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