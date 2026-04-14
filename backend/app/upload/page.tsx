'use client';

import { useState, useRef, useCallback } from 'react';

export default function UploadPage() {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<{ url: string; slug: string; version: number; deduplicated?: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.endsWith('.html') && !file.name.endsWith('.htm')) {
      setError('Please upload an HTML file (.html or .htm)');
      return;
    }

    setIsUploading(true);
    setError(null);
    setResult(null);

    try {
      const html = await file.text();
      if (!html.trim()) {
        setError('The file is empty');
        setIsUploading(false);
        return;
      }

      // Simple hash
      const encoder = new TextEncoder();
      const data = encoder.encode(html);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);

      const res = await fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html, hash }),
      });

      const body = await res.json();

      if (!res.ok && res.status !== 409) {
        setError(body.error || 'Something went wrong');
        setIsUploading(false);
        return;
      }

      setResult(body);
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback(() => setIsDragging(false), []);

  const onFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const copyUrl = useCallback(() => {
    if (result?.url) {
      navigator.clipboard.writeText(result.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [result]);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
    setCopied(false);
  }, []);

  return (
    <div style={{
      fontFamily: '-apple-system, BlinkMacSystemFont, system-ui, sans-serif',
      background: '#0a0a0a',
      color: '#e0e0e0',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      margin: 0,
      padding: 24,
    }}>
      <div style={{ width: '100%', maxWidth: 520, textAlign: 'center' }}>
        <h1 style={{
          fontSize: '2rem',
          fontWeight: 700,
          letterSpacing: '-0.03em',
          marginBottom: 8,
        }}>
          prototype.share
        </h1>
        <p style={{ color: '#666', fontSize: '1.05rem', marginBottom: 40 }}>
          Drop an HTML file. Get a link. Share it with your team.
        </p>

        {!result ? (
          <>
            {/* Drop zone */}
            <div
              onDrop={onDrop}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${isDragging ? '#6366f1' : '#333'}`,
                borderRadius: 16,
                padding: '60px 40px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                background: isDragging ? 'rgba(99, 102, 241, 0.05)' : 'rgba(255, 255, 255, 0.02)',
                transform: isDragging ? 'scale(1.02)' : 'scale(1)',
              }}
            >
              {isUploading ? (
                <div>
                  <div style={{
                    width: 40,
                    height: 40,
                    border: '3px solid #333',
                    borderTopColor: '#6366f1',
                    borderRadius: '50%',
                    margin: '0 auto 16px',
                    animation: 'ps-spin 0.8s linear infinite',
                  }} />
                  <p style={{ color: '#999', fontSize: '1rem' }}>Publishing...</p>
                </div>
              ) : (
                <>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>
                    {isDragging ? '📌' : '📄'}
                  </div>
                  <p style={{ color: '#999', fontSize: '1rem', margin: 0 }}>
                    {isDragging
                      ? 'Drop it!'
                      : 'Drag and drop an HTML file here'}
                  </p>
                  <p style={{ color: '#555', fontSize: '0.85rem', marginTop: 8 }}>
                    or click to browse
                  </p>
                </>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".html,.htm"
              onChange={onFileSelect}
              style={{ display: 'none' }}
            />

            {error && (
              <p style={{
                color: '#ef4444',
                fontSize: '0.9rem',
                marginTop: 16,
                padding: '8px 16px',
                background: 'rgba(239, 68, 68, 0.1)',
                borderRadius: 8,
              }}>
                {error}
              </p>
            )}
          </>
        ) : (
          /* Success state */
          <div style={{
            background: 'rgba(99, 102, 241, 0.05)',
            border: '1px solid rgba(99, 102, 241, 0.2)',
            borderRadius: 16,
            padding: '40px 32px',
            animation: 'ps-fade-up 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
            <p style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 4 }}>
              {result.deduplicated ? 'Already published' : `Published v${result.version}!`}
            </p>
            <p style={{ color: '#666', fontSize: '0.85rem', marginBottom: 24 }}>
              Share this link with your team
            </p>

            {/* URL display + copy */}
            <div
              onClick={copyUrl}
              style={{
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 10,
                padding: '12px 16px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                transition: 'border-color 0.15s ease',
              }}
            >
              <span style={{
                flex: 1,
                fontSize: '0.9rem',
                color: '#a5b4fc',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                textAlign: 'left',
              }}>
                {result.url}
              </span>
              <span style={{
                fontSize: '0.8rem',
                fontWeight: 600,
                color: copied ? '#10b981' : '#999',
                whiteSpace: 'nowrap',
                transition: 'color 0.15s ease',
              }}>
                {copied ? '✓ Copied!' : 'Copy'}
              </span>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
              <a
                href={result.url}
                target="_blank"
                rel="noopener"
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  background: '#6366f1',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  textDecoration: 'none',
                  textAlign: 'center',
                  transition: 'background 0.15s ease',
                }}
              >
                Open prototype →
              </a>
              <button
                onClick={reset}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  background: 'rgba(255, 255, 255, 0.06)',
                  color: '#999',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: 8,
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'background 0.15s ease, color 0.15s ease',
                }}
              >
                Upload another
              </button>
            </div>
          </div>
        )}

        <p style={{ color: '#333', fontSize: '0.75rem', marginTop: 32 }}>
          Reviewers can Shift+click anywhere on the prototype to leave feedback.
        </p>
      </div>

      <style>{`
        @keyframes ps-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes ps-fade-up {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
