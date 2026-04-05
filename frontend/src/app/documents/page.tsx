'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const typeConfig: any = {
  MEDICAL: { color: '#FF6B6B', bg: 'rgba(255,107,107,0.1)', icon: '🩺', label: 'Medical' },
  LEGAL:   { color: '#4ECDC4', bg: 'rgba(78,205,196,0.1)',  icon: '⚖️', label: 'Legal' },
  FINANCIAL: { color: '#FFE66D', bg: 'rgba(255,230,109,0.1)', icon: '💰', label: 'Financial' },
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user ?? null
      setUser(u)
      if (!u) { router.push('/'); return }
      fetchDocuments(u.id)
    })
  }, [])

  const fetchDocuments = async (userId: string) => {
    setLoading(true)
    const { data, error } = await supabase
      .from('documents')
      .select('*, insights(*), drug_interactions(*)')
      .eq('user_id', userId)
      .order('uploaded_at', { ascending: false })
    if (!error && data) setDocuments(data)
    setLoading(false)
  }

  const formatDate = (ts: string) => new Date(ts).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  })

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
        .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 48px; }
        .logo { display: flex; align-items: center; gap: 12px; text-decoration: none; }
        .logo-mark { width: 36px; height: 36px; border-radius: 9px; background: linear-gradient(135deg, #6366f1, #8b5cf6); display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; }
        .logo-text { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; background: linear-gradient(90deg, #e8e6e0, #a09fad); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .back-btn { display: flex; align-items: center; gap: 6px; padding: 8px 16px; background: transparent; border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; color: #6b6a75; font-family: 'DM Mono', monospace; font-size: 12px; cursor: pointer; transition: all 0.2s; text-decoration: none; }
        .back-btn:hover { border-color: rgba(99,102,241,0.3); color: #6366f1; }
        .page-title { font-size: 28px; font-weight: 800; margin-bottom: 8px; }
        .page-sub { font-family: 'DM Mono', monospace; font-size: 12px; color: #6b6a75; margin-bottom: 32px; }
        .doc-grid { display: flex; flex-direction: column; gap: 12px; }
        .doc-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 16px; padding: 20px 24px; cursor: pointer; transition: all 0.2s; text-decoration: none; display: block; animation: fadeUp 0.4s ease both; }
        .doc-card:hover { background: rgba(99,102,241,0.05); border-color: rgba(99,102,241,0.2); transform: translateY(-1px); }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .doc-card-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
        .doc-filename { font-size: 15px; font-weight: 700; color: #e8e6e0; margin-bottom: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 400px; }
        .doc-date { font-family: 'DM Mono', monospace; font-size: 11px; color: #6b6a75; }
        .type-badge { display: flex; align-items: center; gap: 5px; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; font-family: 'DM Mono', monospace; border: 1px solid; white-space: nowrap; flex-shrink: 0; }
        .doc-summary { font-size: 13px; color: #a09fad; line-height: 1.6; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; margin-bottom: 12px; }
        .doc-meta { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
        .doc-meta-item { display: flex; align-items: center; gap: 4px; font-family: 'DM Mono', monospace; font-size: 10px; color: #6b6a75; }
        .doc-meta-dot { width: 4px; height: 4px; border-radius: 50%; background: #3d3c47; }
        .hash-mini { font-family: 'DM Mono', monospace; font-size: 10px; color: #3d3c47; }
        .empty-state { text-align: center; padding: 80px 32px; }
        .empty-icon { font-size: 48px; margin-bottom: 16px; }
        .empty-title { font-size: 18px; font-weight: 700; color: #e8e6e0; margin-bottom: 8px; }
        .empty-sub { font-family: 'DM Mono', monospace; font-size: 12px; color: #6b6a75; margin-bottom: 24px; }
        .upload-link { display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #6366f1, #8b5cf6); border-radius: 12px; color: white; font-family: 'Syne', sans-serif; font-size: 14px; font-weight: 700; text-decoration: none; transition: all 0.2s; }
        .upload-link:hover { transform: translateY(-1px); box-shadow: 0 8px 32px rgba(99,102,241,0.35); }
        .loading-row { display: flex; flex-direction: column; gap: 12px; }
        .skeleton { background: rgba(255,255,255,0.04); border-radius: 16px; height: 100px; animation: shimmer 1.5s infinite; }
        @keyframes shimmer { 0%,100% { opacity: 0.4 } 50% { opacity: 0.7 } }
        .warn-dot { width: 6px; height: 6px; border-radius: 50%; background: #FF6B6B; box-shadow: 0 0 6px #FF6B6B; flex-shrink: 0; }
      `}</style>

      <div className="noise" />
      <div className="grid-bg" />
      <div className="glow-orb" style={{ width: 500, height: 500, top: -150, left: -150, background: 'rgba(99,102,241,0.07)' }} />

      <div className="wrap">
        <div className="header">
          <a href="/" className="logo">
            <div className="logo-mark">⬡</div>
            <span className="logo-text">Datyra</span>
          </a>
          <a href="/" className="back-btn">← Upload New</a>
        </div>

        <div className="page-title">My Documents</div>
        <div className="page-sub">// {loading ? '...' : `${documents.length} document${documents.length !== 1 ? 's' : ''} analyzed`}</div>

        {loading ? (
          <div className="loading-row">
            {[1,2,3].map(i => <div key={i} className="skeleton" style={{ animationDelay: `${i * 0.1}s` }} />)}
          </div>
        ) : documents.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📂</div>
            <div className="empty-title">No documents yet</div>
            <div className="empty-sub">// Upload your first document to get started</div>
            <a href="/" className="upload-link">⚡ Analyze a Document</a>
          </div>
        ) : (
          <div className="doc-grid">
            {documents.map((doc, i) => {
              const cfg = typeConfig[doc.doc_type] || typeConfig.FINANCIAL
              const insights = doc.insights?.[0]?.extracted_json || {}
              const summary = doc.insights?.[0]?.summary || insights.summary || ''
              const hasInteractions = doc.drug_interactions?.length > 0 &&
                doc.drug_interactions[0]?.warnings?.length > 0
              const keyPointsCount = insights.key_points?.length || 0
              const medicineCount = insights.medicines?.length || 0

              return (
                <a
                  key={doc.id}
                  href={`/documents/${doc.id}`}
                  className="doc-card"
                  style={{ animationDelay: `${i * 0.05}s` }}
                >
                  <div className="doc-card-top">
                    <div style={{ minWidth: 0 }}>
                      <div className="doc-filename">{doc.filename}</div>
                      <div className="doc-date">{formatDate(doc.uploaded_at)}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      {hasInteractions && <div className="warn-dot" title="Drug interaction warnings" />}
                      <div className="type-badge" style={{ color: cfg.color, borderColor: cfg.color + '40', background: cfg.bg }}>
                        <span>{cfg.icon}</span>{cfg.label}
                      </div>
                    </div>
                  </div>

                  {summary && <div className="doc-summary">{summary}</div>}

                  <div className="doc-meta">
                    {keyPointsCount > 0 && (
                      <span className="doc-meta-item">{keyPointsCount} key points</span>
                    )}
                    {medicineCount > 0 && (
                      <>
                        <div className="doc-meta-dot" />
                        <span className="doc-meta-item" style={{ color: '#FF6B6B' }}>💊 {medicineCount} medicines</span>
                      </>
                    )}
                    {hasInteractions && (
                      <>
                        <div className="doc-meta-dot" />
                        <span className="doc-meta-item" style={{ color: '#FF6B6B' }}>⚠ interactions found</span>
                      </>
                    )}
                    <div className="doc-meta-dot" />
                    <span className="hash-mini">{doc.hash?.slice(0, 16)}...</span>
                  </div>
                </a>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}