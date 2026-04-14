import { readFileSync } from 'fs';
import { join } from 'path';

function parseChangelog(): { version: string; date: string; changes: string[] }[] {
  const raw = readFileSync(join(process.cwd(), 'CHANGELOG.md'), 'utf-8');
  const entries: { version: string; date: string; changes: string[] }[] = [];
  let current: { version: string; date: string; changes: string[] } | null = null;

  for (const line of raw.split('\n')) {
    const heading = line.match(/^## (v[\d.]+)\s*[—–-]\s*(.+)$/);
    if (heading) {
      if (current) entries.push(current);
      current = { version: heading[1], date: heading[2].trim(), changes: [] };
      continue;
    }
    if (current && line.startsWith('- ')) {
      current.changes.push(line.slice(2));
    }
  }
  if (current) entries.push(current);
  return entries;
}

export default function ChangesPage() {
  const entries = parseChangelog();
  const latest = entries[0];
  const total = entries.length;

  return (
    <div style={{
      fontFamily: "'SF Mono', 'Fira Code', 'JetBrains Mono', monospace",
      background: '#0a0a0a',
      color: '#e0e0e0',
      minHeight: '100vh',
      position: 'relative',
    }}>
      {/* Grid bg */}
      <div style={{
        position: 'fixed', inset: 0,
        backgroundImage: 'linear-gradient(rgba(50,50,50,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(50,50,50,0.15) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
        pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 640, margin: '0 auto', padding: '48px 24px' }}>
        <div style={{ marginBottom: 40 }}>
          <h1 style={{
            fontSize: '1.8rem', fontWeight: 700, color: '#8B5CF6',
            letterSpacing: '0.1em', margin: '0 0 4px',
            textShadow: '0 0 20px rgba(139,92,246,0.3)',
          }}>
            CHANGELOG
          </h1>
          <p style={{ color: '#444', fontSize: '0.75rem', letterSpacing: '0.2em', margin: 0 }}>
            DESIGN FEEDBACK MACHINE — {total} RELEASES
          </p>
          <a href="/upload" style={{
            display: 'inline-block', marginTop: 16, color: '#555',
            fontSize: '0.75rem', textDecoration: 'none', letterSpacing: '0.1em',
          }}>
            ← Back to robot
          </a>
        </div>

        {entries.map((entry, i) => (
          <div key={entry.version} style={{
            marginBottom: 32,
            paddingBottom: 32,
            borderBottom: i < entries.length - 1 ? '1px solid #1a1a1a' : 'none',
          }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 12 }}>
              <span style={{
                fontSize: '0.85rem', fontWeight: 700, color: i === 0 ? '#8B5CF6' : '#666',
                padding: '2px 10px', borderRadius: 6,
                background: i === 0 ? 'rgba(139,92,246,0.12)' : 'rgba(255,255,255,0.04)',
                border: i === 0 ? '1px solid rgba(139,92,246,0.25)' : '1px solid #222',
              }}>
                {entry.version}
              </span>
              <span style={{ fontSize: '0.7rem', color: '#444' }}>{entry.date}</span>
              {i === 0 && (
                <span style={{
                  fontSize: '0.6rem', color: '#8B5CF6', fontWeight: 600,
                  letterSpacing: '0.1em',
                }}>LATEST</span>
              )}
            </div>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {entry.changes.map((c, j) => {
                const [title, ...rest] = c.split(' — ');
                return (
                  <li key={j} style={{ marginBottom: 6, fontSize: '0.8rem', lineHeight: 1.5 }}>
                    <span style={{ color: '#ccc', fontWeight: 600 }}>{title}</span>
                    {rest.length > 0 && (
                      <span style={{ color: '#555' }}> — {rest.join(' — ')}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}

        <p style={{ color: '#222', fontSize: '0.65rem', textAlign: 'center', marginTop: 40 }}>
          Built by a robot that eats HTML files
        </p>
      </div>
    </div>
  );
}
