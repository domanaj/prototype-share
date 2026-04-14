'use client';

import { useState, useEffect } from 'react';

interface Prototype {
  slug: string;
  latestVersion: number;
  createdAt: string;
  commentCount: number;
}

async function uploadNewVersion(slug: string, file: File): Promise<{ version: number; deduplicated?: boolean } | null> {
  const html = await file.text();
  if (!html.trim()) return null;

  const encoder = new TextEncoder();
  const data = encoder.encode(html);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);

  const res = await fetch('/api/publish', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ html, hash, slug }),
  });

  const body = await res.json();
  if (!res.ok && res.status !== 409) return null;
  return body;
}

export default function GalleryPage() {
  const [prototypes, setPrototypes] = useState<Prototype[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingSlug, setUpdatingSlug] = useState<string | null>(null);
  const [updateSuccess, setUpdateSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/gallery')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setPrototypes(data);
        else setError(data.error || 'Failed to load');
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days === 1) return 'yesterday';
    return `${days}d ago`;
  };

  return (
    <div className="gal-page">
      <div className="gal-grid-bg" />

      <div className="gal-container">
        {/* Header */}
        <div className="gal-header">
          <div className="gal-header-left">
            <h1 className="gal-title">HTML ROBOT FACTORY</h1>
            <p className="gal-subtitle">ALL PROTOTYPES CONSUMED BY THE ROBOT. YUM!</p>
          </div>
          <a href="/upload" className="gal-upload-btn">
            <span className="gal-upload-icon">🤖</span> Feed the robot
          </a>
        </div>

        {/* Content */}
        {loading ? (
          <div className="gal-loading">
            <div className="gal-spinner" />
            <p>Robot is remembering what it ate...</p>
          </div>
        ) : error ? (
          <div className="gal-error">Robot confused: {error}</div>
        ) : prototypes.length === 0 ? (
          <div className="gal-empty">
            <div className="gal-empty-robot">🤖</div>
            <p className="gal-empty-text">The robot hasn&apos;t eaten any HTML files yet.</p>
            <a href="/upload" className="gal-empty-link">Feed it something →</a>
          </div>
        ) : (
          <div className="gal-grid">
            {prototypes.map((p, i) => (
              <div
                key={p.slug}
                className={`gal-card ${updatingSlug === p.slug ? 'gal-card-updating' : ''} ${updateSuccess === p.slug ? 'gal-card-success' : ''}`}
                style={{ animationDelay: `${i * 60}ms` }}
              >
                {/* Preview - clickable to open */}
                <a href={`/p/${p.slug}`} className="gal-preview-link">
                  <div className="gal-preview">
                    <iframe
                      src={`/p/${p.slug}?bare=1`}
                      title={p.slug}
                      sandbox="allow-same-origin"
                      scrolling="no"
                      tabIndex={-1}
                    />
                    <div className="gal-preview-overlay" />
                  </div>
                </a>

                {/* Card info */}
                <div className="gal-card-info">
                  <div className="gal-card-top-row">
                    <a href={`/p/${p.slug}`} className="gal-card-name">{p.slug}</a>
                    {/* Update button */}
                    <label className="gal-update-btn" title="Upload a new version">
                      <input
                        type="file"
                        accept=".html,.htm"
                        style={{ display: 'none' }}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setUpdatingSlug(p.slug);
                          setUpdateSuccess(null);
                          const result = await uploadNewVersion(p.slug, file);
                          setUpdatingSlug(null);
                          if (result) {
                            setUpdateSuccess(p.slug);
                            setTimeout(() => setUpdateSuccess(null), 2000);
                            // Refresh the list
                            const res = await fetch('/api/gallery');
                            const data = await res.json();
                            if (Array.isArray(data)) setPrototypes(data);
                          }
                          e.target.value = '';
                        }}
                      />
                      {updatingSlug === p.slug ? (
                        <span className="gal-update-icon">⏳</span>
                      ) : updateSuccess === p.slug ? (
                        <span className="gal-update-icon gal-update-success">✓</span>
                      ) : (
                        <span className="gal-update-icon">↑</span>
                      )}
                    </label>
                  </div>
                  <div className="gal-card-meta">
                    <span className="gal-badge gal-badge-version">v{p.latestVersion}</span>
                    {p.commentCount > 0 && (
                      <span className="gal-badge gal-badge-comments">
                        💬 {p.commentCount}
                      </span>
                    )}
                    <span className="gal-card-time">{timeAgo(p.createdAt)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .gal-page {
          font-family: 'SF Mono', 'Fira Code', 'JetBrains Mono', monospace;
          background: #0a0a0a;
          color: #e0e0e0;
          min-height: 100vh;
          position: relative;
        }

        .gal-grid-bg {
          position: fixed;
          inset: 0;
          background-image:
            linear-gradient(rgba(50, 50, 50, 0.15) 1px, transparent 1px),
            linear-gradient(90deg, rgba(50, 50, 50, 0.15) 1px, transparent 1px);
          background-size: 40px 40px;
          pointer-events: none;
        }

        .gal-container {
          position: relative;
          z-index: 1;
          max-width: 1000px;
          margin: 0 auto;
          padding: 40px 24px;
        }

        /* Header */
        .gal-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          margin-bottom: 32px;
          gap: 16px;
          flex-wrap: wrap;
        }
        .gal-header-left {}
        .gal-title {
          font-size: 1.6rem;
          font-weight: 700;
          color: #4ade80;
          letter-spacing: 0.12em;
          margin: 0;
          text-shadow: 0 0 20px rgba(74, 222, 128, 0.25);
        }
        .gal-subtitle {
          font-size: 0.7rem;
          color: #444;
          letter-spacing: 0.2em;
          margin: 4px 0 0;
        }
        .gal-upload-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          background: rgba(74, 222, 128, 0.1);
          border: 1px solid rgba(74, 222, 128, 0.25);
          border-radius: 8px;
          color: #4ade80;
          font-size: 0.8rem;
          font-weight: 600;
          font-family: inherit;
          text-decoration: none;
          letter-spacing: 0.05em;
          transition: all 0.2s ease;
        }
        .gal-upload-btn:hover {
          background: rgba(74, 222, 128, 0.15);
          border-color: #4ade80;
          box-shadow: 0 0 20px rgba(74, 222, 128, 0.15);
        }

        /* Grid */
        .gal-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 16px;
        }

        /* Card */
        .gal-card {
          background: #141414;
          border: 1px solid #222;
          border-radius: 12px;
          overflow: hidden;
          color: inherit;
          transition: all 0.2s ease;
          animation: gal-fade-in 0.4s ease forwards;
          opacity: 0;
        }
        .gal-card:hover {
          border-color: #4ade80;
          box-shadow: 0 0 24px rgba(74, 222, 128, 0.1);
          transform: translateY(-2px);
        }
        .gal-card-updating {
          border-color: #f97316 !important;
          box-shadow: 0 0 24px rgba(249, 115, 22, 0.15) !important;
        }
        .gal-card-success {
          border-color: #4ade80 !important;
          box-shadow: 0 0 24px rgba(74, 222, 128, 0.2) !important;
        }
        .gal-preview-link {
          display: block;
          text-decoration: none;
          color: inherit;
        }

        /* Preview */
        .gal-preview {
          position: relative;
          height: 180px;
          overflow: hidden;
          background: #0a0a0a;
        }
        .gal-preview iframe {
          width: 200%;
          height: 200%;
          transform: scale(0.5);
          transform-origin: top left;
          border: none;
          pointer-events: none;
        }
        .gal-preview-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(transparent 60%, #141414 100%);
        }

        /* Card info */
        .gal-card-info {
          padding: 12px 16px 14px;
        }
        .gal-card-top-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 6px;
        }
        .gal-card-name {
          font-size: 0.85rem;
          font-weight: 600;
          color: #ccc;
          text-decoration: none;
          transition: color 0.15s ease;
        }
        .gal-card-name:hover { color: #4ade80; }
        .gal-update-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid #333;
          cursor: pointer;
          transition: all 0.15s ease;
          flex-shrink: 0;
        }
        .gal-update-btn:hover {
          background: rgba(74, 222, 128, 0.1);
          border-color: #4ade80;
        }
        .gal-update-icon {
          font-size: 0.75rem;
          color: #666;
          transition: color 0.15s ease;
        }
        .gal-update-btn:hover .gal-update-icon { color: #4ade80; }
        .gal-update-success { color: #4ade80 !important; }
        .gal-card-meta {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .gal-badge {
          font-size: 0.65rem;
          padding: 2px 8px;
          border-radius: 4px;
          font-weight: 600;
          letter-spacing: 0.05em;
        }
        .gal-badge-version {
          background: rgba(99, 102, 241, 0.15);
          color: #a5b4fc;
        }
        .gal-badge-comments {
          background: rgba(249, 115, 22, 0.1);
          color: #f97316;
        }
        .gal-card-time {
          font-size: 0.65rem;
          color: #444;
          margin-left: auto;
        }

        /* Loading */
        .gal-loading {
          text-align: center;
          padding: 80px 0;
          color: #444;
          font-size: 0.85rem;
        }
        .gal-spinner {
          width: 32px;
          height: 32px;
          border: 3px solid #222;
          border-top-color: #4ade80;
          border-radius: 50%;
          margin: 0 auto 16px;
          animation: gal-spin 0.8s linear infinite;
        }

        /* Empty */
        .gal-empty {
          text-align: center;
          padding: 80px 0;
        }
        .gal-empty-robot { font-size: 64px; margin-bottom: 16px; }
        .gal-empty-text { color: #444; font-size: 0.9rem; }
        .gal-empty-link {
          display: inline-block;
          margin-top: 12px;
          color: #4ade80;
          text-decoration: none;
          font-size: 0.85rem;
          font-weight: 600;
        }
        .gal-empty-link:hover { text-decoration: underline; }

        .gal-error {
          text-align: center;
          padding: 40px;
          color: #ef4444;
          font-size: 0.85rem;
        }

        @keyframes gal-fade-in {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes gal-spin {
          to { transform: rotate(360deg); }
        }

        @media (prefers-reduced-motion: reduce) {
          .gal-card { animation: none !important; opacity: 1; }
          .gal-spinner { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
