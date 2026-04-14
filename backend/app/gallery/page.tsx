'use client';

import { useState, useEffect } from 'react';

interface Prototype {
  slug: string;
  latestVersion: number;
  createdAt: string;
  commentCount: number;
}

export default function GalleryPage() {
  const [prototypes, setPrototypes] = useState<Prototype[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
              <a
                key={p.slug}
                href={`/p/${p.slug}`}
                className="gal-card"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                {/* Preview iframe */}
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

                {/* Card info */}
                <div className="gal-card-info">
                  <div className="gal-card-name">{p.slug}</div>
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
              </a>
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
          text-decoration: none;
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
        .gal-card-name {
          font-size: 0.85rem;
          font-weight: 600;
          color: #ccc;
          margin-bottom: 6px;
        }
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
