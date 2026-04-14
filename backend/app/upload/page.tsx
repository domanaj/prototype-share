'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

export default function UploadPage() {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isChewing, setIsChewing] = useState(false);
  const [result, setResult] = useState<{ url: string; slug: string; version: number; deduplicated?: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [filesConsumed, setFilesConsumed] = useState(0);
  const [chewFrame, setChewFrame] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chewIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const count = parseInt(localStorage.getItem('ps-files-consumed') || '0');
    setFilesConsumed(count);
  }, []);

  // Chomping animation: cycle through frames while chewing
  useEffect(() => {
    if (isChewing) {
      chewIntervalRef.current = setInterval(() => {
        setChewFrame(f => (f + 1) % 4);
      }, 200);
    } else {
      if (chewIntervalRef.current) clearInterval(chewIntervalRef.current);
      setChewFrame(0);
    }
    return () => { if (chewIntervalRef.current) clearInterval(chewIntervalRef.current); };
  }, [isChewing]);

  // Remember slugs per filename so re-uploading the same file creates v2, v3, etc.
  const getSlugForFile = (filename: string): string | undefined => {
    try {
      const map = JSON.parse(localStorage.getItem('ps-file-slugs') || '{}');
      return map[filename];
    } catch { return undefined; }
  };

  const saveSlugForFile = (filename: string, slug: string) => {
    try {
      const map = JSON.parse(localStorage.getItem('ps-file-slugs') || '{}');
      map[filename] = slug;
      localStorage.setItem('ps-file-slugs', JSON.stringify(map));
    } catch { /* ignore */ }
  };

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.endsWith('.html') && !file.name.endsWith('.htm')) {
      setError('I only eat HTML files. Try again.');
      return;
    }

    setIsUploading(true);
    setIsChewing(true);
    setError(null);
    setResult(null);

    try {
      const html = await file.text();
      if (!html.trim()) {
        setError('That file was empty. I\u2019m still hungry.');
        setIsUploading(false);
        setIsChewing(false);
        return;
      }

      const encoder = new TextEncoder();
      const data = encoder.encode(html);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);

      // Check if we've uploaded this filename before (creates v2, v3, etc.)
      const existingSlug = getSlugForFile(file.name);

      const res = await fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html, hash, slug: existingSlug }),
      });

      const body = await res.json();

      if (!res.ok && res.status !== 409) {
        setError(body.error || 'Something went wrong. Robot confused.');
        setIsUploading(false);
        setIsChewing(false);
        return;
      }

      // Remember this filename -> slug mapping
      saveSlugForFile(file.name, body.slug);

      // Keep chomping for at least 1.5s so the animation is visible
      await new Promise(r => setTimeout(r, 1500));

      const newCount = filesConsumed + 1;
      setFilesConsumed(newCount);
      localStorage.setItem('ps-files-consumed', String(newCount));
      setResult(body);
    } catch (err: any) {
      setError(err.message || 'Upload failed. Robot sad.');
    } finally {
      setIsUploading(false);
      setIsChewing(false);
    }
  }, [filesConsumed]);

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

  const robotQuote = () => {
    if (isChewing) return '"Mmmmch... processing... nom nom nom..." \u2014 Robot';
    if (filesConsumed === 0) return `"I have consumed 0 HTML files today. I am hungry." \u2014 Robot`;
    if (filesConsumed === 1) return `"I have consumed 1 HTML file today. Delicious." \u2014 Robot`;
    if (filesConsumed < 5) return `"I have consumed ${filesConsumed} HTML files today. More please." \u2014 Robot`;
    if (filesConsumed < 10) return `"I have consumed ${filesConsumed} HTML files today. I am becoming powerful." \u2014 Robot`;
    return `"I have consumed ${filesConsumed} HTML files today. I am unstoppable." \u2014 Robot`;
  };

  return (
    <div className="ps-upload-page">
      {/* Grid background */}
      <div className="ps-grid-bg" />

      {!result ? (
        <div className="ps-upload-container">
          <h1 className="ps-title">HTML REVIEWER</h1>
          <p className="ps-subtitle">DESIGN FEEDBACK MACHINE v0.1</p>

          {/* Robot */}
          <div
            className={`ps-robot ${isDragging ? 'ps-robot-excited' : ''} ${isChewing ? 'ps-robot-chewing' : ''}`}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onClick={() => !isUploading && fileInputRef.current?.click()}
          >
            {/* Antenna */}
            <div className="ps-antenna">
              <div className="ps-antenna-stick" />
              <div className={`ps-antenna-light ${isDragging ? 'ps-blink-fast' : ''}`} />
            </div>

            {/* Body */}
            <div className="ps-robot-body">
              {/* Screws */}
              <div className="ps-screw ps-screw-tl" />
              <div className="ps-screw ps-screw-tr" />

              {/* Eyes */}
              <div className="ps-eyes">
                <div className={`ps-eye ps-eye-left ${isDragging ? 'ps-eye-wide' : ''} ${isChewing ? 'ps-eye-chomp' : ''}`}
                  style={isChewing ? { transform: `scaleY(${chewFrame % 2 === 0 ? 0.7 : 1})` } : undefined}>
                  <div className="ps-pupil" /><div className="ps-pupil" />
                  <div className="ps-pupil" /><div className="ps-pupil" />
                </div>
                <div className="ps-eye-divider">{isChewing ? ['~', '^', '~', 'v'][chewFrame] : '\u2014'}</div>
                <div className={`ps-eye ps-eye-right ${isDragging ? 'ps-eye-wide' : ''} ${isChewing ? 'ps-eye-chomp' : ''}`}
                  style={isChewing ? { transform: `scaleY(${chewFrame % 2 === 0 ? 0.7 : 1})` } : undefined}>
                  <div className="ps-pupil" /><div className="ps-pupil" />
                  <div className="ps-pupil" /><div className="ps-pupil" />
                </div>
              </div>

              {/* Side lights */}
              <div className="ps-side-lights ps-side-left">
                <div className={`ps-side-light ${isDragging || isChewing ? 'ps-light-on' : ''}`} />
                <div className={`ps-side-light ${isDragging || isChewing ? 'ps-light-on ps-light-delay' : ''}`} />
              </div>
              <div className="ps-side-lights ps-side-right">
                <div className={`ps-side-light ${isDragging || isChewing ? 'ps-light-on' : ''}`} />
                <div className={`ps-side-light ${isDragging || isChewing ? 'ps-light-on ps-light-delay' : ''}`} />
              </div>

              {/* Mouth (drop zone) */}
              <div className={`ps-mouth ${isDragging ? 'ps-mouth-open' : ''} ${isChewing ? 'ps-mouth-chewing' : ''}`}
                style={isChewing ? { paddingTop: chewFrame % 2 === 0 ? 12 : 24, paddingBottom: chewFrame % 2 === 0 ? 24 : 12 } : undefined}
              >
                {isChewing ? (
                  <div className="ps-mouth-text" style={{ color: '#f97316' }}>
                    {['NOM', 'CHOMP', 'MUNCH', 'CRUNCH'][chewFrame]}
                  </div>
                ) : isUploading ? (
                  <div className="ps-mouth-text">PROCESSING...</div>
                ) : isDragging ? (
                  <div className="ps-mouth-text ps-mouth-ready">FEED ME</div>
                ) : (
                  <>
                    <div className="ps-mouth-text">DROP HTML</div>
                    <div className="ps-mouth-subtext">INTO MOUTH</div>
                  </>
                )}
                {/* Teeth */}
                <div className="ps-teeth ps-teeth-top" style={isChewing ? { transform: `translateY(${chewFrame % 2 === 0 ? 4 : 0}px)` } : undefined}>
                  {[...Array(7)].map((_, i) => <div key={i} className="ps-tooth" />)}
                </div>
                <div className="ps-teeth ps-teeth-bottom" style={isChewing ? { transform: `translateY(${chewFrame % 2 === 0 ? -4 : 0}px)` } : undefined}>
                  {[...Array(7)].map((_, i) => <div key={i} className="ps-tooth" />)}
                </div>
              </div>

              {/* Chin / output tray */}
              <div className="ps-chin">
                <div className="ps-chin-slot" />
              </div>
            </div>

            {/* Glow effect */}
            <div className="ps-glow" />
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".html,.htm"
            onChange={onFileSelect}
            style={{ display: 'none' }}
          />

          <p className="ps-instructions">
            Drag & drop an HTML file into the robot's mouth<br />
            or click the robot to browse
          </p>

          {error && <p className="ps-error">{error}</p>}

          <div className="ps-quote">{robotQuote()}</div>
        </div>
      ) : (
        /* Success state */
        <div className="ps-success-container">
          <h1 className="ps-title" style={{ color: '#4ade80' }}>CONSUMED</h1>
          <p className="ps-subtitle">
            {result.deduplicated ? 'ALREADY IN MY BELLY' : `VERSION ${result.version} DIGESTED`}
          </p>

          <div className="ps-robot ps-robot-happy">
            <div className="ps-antenna">
              <div className="ps-antenna-stick" />
              <div className="ps-antenna-light ps-antenna-green" />
            </div>
            <div className="ps-robot-body">
              <div className="ps-screw ps-screw-tl" />
              <div className="ps-screw ps-screw-tr" />
              <div className="ps-eyes">
                <div className="ps-eye ps-eye-left ps-eye-happy">
                  <div className="ps-pupil" /><div className="ps-pupil" />
                  <div className="ps-pupil" /><div className="ps-pupil" />
                </div>
                <div className="ps-eye-divider">^</div>
                <div className="ps-eye ps-eye-right ps-eye-happy">
                  <div className="ps-pupil" /><div className="ps-pupil" />
                  <div className="ps-pupil" /><div className="ps-pupil" />
                </div>
              </div>
              <div className="ps-side-lights ps-side-left">
                <div className="ps-side-light ps-light-green" />
                <div className="ps-side-light ps-light-green ps-light-delay" />
              </div>
              <div className="ps-side-lights ps-side-right">
                <div className="ps-side-light ps-light-green" />
                <div className="ps-side-light ps-light-green ps-light-delay" />
              </div>
              <div className="ps-mouth ps-mouth-smile">
                <div className="ps-mouth-text" style={{ color: '#4ade80' }}>YUM</div>
              </div>
              <div className="ps-chin"><div className="ps-chin-slot" /></div>
            </div>
            <div className="ps-glow ps-glow-green" />
          </div>

          <p className="ps-instructions" style={{ marginTop: 24 }}>Share this link with your team</p>

          <div className="ps-url-box" onClick={copyUrl}>
            <span className="ps-url-text">{result.url}</span>
            <span className={`ps-copy-btn ${copied ? 'ps-copied' : ''}`}>
              {copied ? '✓ COPIED' : 'COPY'}
            </span>
          </div>

          <div className="ps-action-buttons">
            <a href={result.url} target="_blank" rel="noopener" className="ps-btn ps-btn-primary">
              Open prototype →
            </a>
            <button onClick={reset} className="ps-btn ps-btn-secondary">
              Feed another
            </button>
          </div>

          <div className="ps-quote">
            {`"${result.deduplicated ? 'I already ate that one.' : 'Delicious. Your team can Shift+click to leave feedback.'}" \u2014 Robot`}
          </div>
        </div>
      )}

      <style>{`
        .ps-upload-page {
          font-family: 'SF Mono', 'Fira Code', 'JetBrains Mono', monospace;
          background: #0a0a0a;
          color: #e0e0e0;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
        }

        .ps-grid-bg {
          position: fixed;
          inset: 0;
          background-image:
            linear-gradient(rgba(50, 50, 50, 0.15) 1px, transparent 1px),
            linear-gradient(90deg, rgba(50, 50, 50, 0.15) 1px, transparent 1px);
          background-size: 40px 40px;
          pointer-events: none;
        }

        .ps-upload-container, .ps-success-container {
          position: relative;
          z-index: 1;
          text-align: center;
          padding: 40px 24px;
          max-width: 600px;
          width: 100%;
        }

        .ps-title {
          font-size: 2.2rem;
          font-weight: 700;
          color: #4ade80;
          letter-spacing: 0.15em;
          margin: 0 0 4px;
          text-shadow: 0 0 20px rgba(74, 222, 128, 0.3);
        }

        .ps-subtitle {
          font-size: 0.8rem;
          color: #555;
          letter-spacing: 0.2em;
          margin: 0 0 32px;
        }

        /* ─── Robot ─── */
        .ps-robot {
          position: relative;
          cursor: pointer;
          display: inline-block;
          transition: transform 0.3s ease;
          padding-top: 20px;
        }
        .ps-robot:hover { transform: scale(1.02); }
        .ps-robot-excited { transform: scale(1.05) !important; }
        .ps-robot-chewing { animation: ps-chomp 0.3s ease infinite; }
        .ps-robot-happy { animation: ps-wiggle 2s ease-in-out infinite; }

        .ps-robot-body {
          position: relative;
          width: 280px;
          background: #2a2a2a;
          border: 2px solid #444;
          border-radius: 20px;
          padding: 20px 24px 12px;
          box-shadow: inset 0 2px 4px rgba(0,0,0,0.5);
        }

        /* Antenna */
        .ps-antenna {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: -4px;
          position: relative;
          z-index: 2;
        }
        .ps-antenna-stick {
          width: 4px;
          height: 20px;
          background: #555;
          border-radius: 2px;
        }
        .ps-antenna-light {
          width: 14px;
          height: 14px;
          background: #ef4444;
          border-radius: 50%;
          box-shadow: 0 0 8px rgba(239, 68, 68, 0.6);
          animation: ps-blink 2s ease-in-out infinite;
        }
        .ps-antenna-light.ps-blink-fast { animation: ps-blink 0.4s ease-in-out infinite; }
        .ps-antenna-light.ps-antenna-green {
          background: #4ade80;
          box-shadow: 0 0 12px rgba(74, 222, 128, 0.8);
        }

        /* Screws */
        .ps-screw {
          position: absolute;
          width: 10px;
          height: 10px;
          background: #3a3a3a;
          border: 1px solid #555;
          border-radius: 50%;
        }
        .ps-screw::after {
          content: '+';
          position: absolute;
          top: -2px;
          left: 1px;
          font-size: 9px;
          color: #666;
        }
        .ps-screw-tl { top: 12px; left: 12px; }
        .ps-screw-tr { top: 12px; right: 12px; }

        /* Eyes */
        .ps-eyes {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-bottom: 16px;
        }
        .ps-eye {
          width: 72px;
          height: 52px;
          background: #111;
          border: 2px solid #444;
          border-radius: 6px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4px;
          padding: 8px;
          transition: all 0.2s ease;
        }
        .ps-eye-wide {
          box-shadow: 0 0 12px rgba(56, 189, 248, 0.4);
          border-color: #38bdf8;
        }
        .ps-eye-happy {
          box-shadow: 0 0 12px rgba(74, 222, 128, 0.3);
          border-color: #4ade80;
        }
        .ps-eye-chomp {
          box-shadow: 0 0 12px rgba(249, 115, 22, 0.4);
          border-color: #f97316;
          transition: transform 0.15s ease;
        }
        .ps-eye-chomp .ps-pupil { background: #f97316; }
        .ps-pupil {
          background: #38bdf8;
          border-radius: 2px;
          transition: background 0.2s ease;
        }
        .ps-eye-happy .ps-pupil { background: #4ade80; }
        .ps-eye-divider {
          color: #555;
          font-size: 1.2rem;
          line-height: 1;
        }

        /* Side lights */
        .ps-side-lights {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .ps-side-left { left: -18px; }
        .ps-side-right { right: -18px; }
        .ps-side-light {
          width: 10px;
          height: 16px;
          background: #f97316;
          border-radius: 3px;
          opacity: 0.4;
          transition: all 0.3s ease;
        }
        .ps-side-light.ps-light-on {
          opacity: 1;
          box-shadow: 0 0 10px rgba(249, 115, 22, 0.8);
          animation: ps-pulse-light 0.6s ease-in-out infinite;
        }
        .ps-side-light.ps-light-delay { animation-delay: 0.3s; }
        .ps-side-light.ps-light-green {
          background: #4ade80;
          opacity: 1;
          box-shadow: 0 0 10px rgba(74, 222, 128, 0.8);
          animation: ps-pulse-light 1s ease-in-out infinite;
        }

        /* Mouth */
        .ps-mouth {
          position: relative;
          background: #111;
          border: 2px solid #444;
          border-radius: 8px;
          padding: 20px;
          margin: 0 8px;
          transition: all 0.3s ease;
          overflow: hidden;
        }
        .ps-mouth-open {
          border-color: #4ade80;
          box-shadow: 0 0 20px rgba(74, 222, 128, 0.2);
          padding: 28px 20px;
        }
        .ps-mouth-chewing {
          animation: ps-chew-mouth 0.3s ease infinite;
        }
        .ps-mouth-smile {
          border-color: #4ade80;
          box-shadow: 0 0 12px rgba(74, 222, 128, 0.15);
          border-radius: 8px 8px 20px 20px;
        }
        .ps-mouth-text {
          font-size: 0.95rem;
          font-weight: 700;
          color: #666;
          letter-spacing: 0.15em;
          transition: color 0.2s ease;
        }
        .ps-mouth-ready { color: #4ade80 !important; text-shadow: 0 0 10px rgba(74, 222, 128, 0.4); }
        .ps-mouth-subtext {
          font-size: 0.65rem;
          color: #444;
          letter-spacing: 0.2em;
          margin-top: 4px;
        }

        /* Teeth */
        .ps-teeth {
          display: flex;
          justify-content: center;
          gap: 3px;
          position: absolute;
          left: 10px;
          right: 10px;
        }
        .ps-teeth-top { top: -1px; }
        .ps-teeth-bottom { bottom: -1px; }
        .ps-tooth {
          width: 14px;
          height: 6px;
          background: #333;
          border-radius: 0 0 3px 3px;
        }
        .ps-teeth-top .ps-tooth { border-radius: 3px 3px 0 0; }

        /* Chin */
        .ps-chin {
          margin-top: 10px;
          padding: 0 20px;
        }
        .ps-chin-slot {
          height: 8px;
          background: #1a1a1a;
          border: 1px solid #333;
          border-radius: 4px;
        }

        /* Glow */
        .ps-glow {
          position: absolute;
          inset: -8px;
          border-radius: 24px;
          opacity: 0;
          transition: opacity 0.4s ease;
          pointer-events: none;
          z-index: -1;
          box-shadow: 0 0 40px rgba(74, 222, 128, 0.15), 0 0 80px rgba(74, 222, 128, 0.08);
        }
        .ps-robot:hover .ps-glow { opacity: 0.6; }
        .ps-robot-excited .ps-glow { opacity: 1 !important; box-shadow: 0 0 60px rgba(74, 222, 128, 0.3), 0 0 120px rgba(74, 222, 128, 0.15); }
        .ps-glow-green { opacity: 0.8 !important; box-shadow: 0 0 60px rgba(74, 222, 128, 0.25), 0 0 120px rgba(74, 222, 128, 0.1); }

        /* ─── Text elements ─── */
        .ps-instructions {
          color: #555;
          font-size: 0.8rem;
          margin-top: 28px;
          line-height: 1.6;
        }

        .ps-error {
          color: #ef4444;
          font-size: 0.8rem;
          margin-top: 12px;
          padding: 8px 16px;
          background: rgba(239, 68, 68, 0.08);
          border: 1px solid rgba(239, 68, 68, 0.2);
          border-radius: 6px;
          display: inline-block;
        }

        .ps-quote {
          margin-top: 32px;
          padding: 10px 20px;
          border: 1px solid #222;
          border-radius: 6px;
          font-size: 0.72rem;
          color: #444;
          font-style: italic;
          display: inline-block;
        }

        /* ─── Success state ─── */
        .ps-url-box {
          margin: 16px auto 0;
          max-width: 460px;
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid #333;
          border-radius: 8px;
          padding: 12px 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          transition: border-color 0.15s ease;
        }
        .ps-url-box:hover { border-color: #4ade80; }
        .ps-url-text {
          flex: 1;
          font-size: 0.8rem;
          color: #4ade80;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          text-align: left;
        }
        .ps-copy-btn {
          font-size: 0.7rem;
          font-weight: 700;
          color: #666;
          letter-spacing: 0.1em;
          white-space: nowrap;
          transition: color 0.15s ease;
        }
        .ps-copy-btn.ps-copied { color: #4ade80; }

        .ps-action-buttons {
          display: flex;
          gap: 12px;
          margin-top: 16px;
          max-width: 460px;
          margin-left: auto;
          margin-right: auto;
        }
        .ps-btn {
          flex: 1;
          padding: 10px 16px;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          text-decoration: none;
          text-align: center;
          transition: all 0.15s ease;
          letter-spacing: 0.05em;
        }
        .ps-btn-primary {
          background: #4ade80;
          color: #0a0a0a;
          border: none;
        }
        .ps-btn-primary:hover { background: #22c55e; box-shadow: 0 0 20px rgba(74, 222, 128, 0.3); }
        .ps-btn-secondary {
          background: transparent;
          color: #666;
          border: 1px solid #333;
        }
        .ps-btn-secondary:hover { border-color: #555; color: #999; }

        /* ─── Animations ─── */
        @keyframes ps-blink {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
        @keyframes ps-pulse-light {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        @keyframes ps-chomp {
          0%, 100% { transform: scale(1.05) translateY(0); }
          50% { transform: scale(1.05) translateY(2px); }
        }
        @keyframes ps-chew-mouth {
          0%, 100% { padding: 20px; }
          50% { padding: 16px 20px 24px; }
        }
        @keyframes ps-wiggle {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-1deg); }
          75% { transform: rotate(1deg); }
        }

        @media (prefers-reduced-motion: reduce) {
          .ps-robot, .ps-robot-chewing, .ps-robot-happy,
          .ps-antenna-light, .ps-side-light, .ps-mouth-chewing {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
