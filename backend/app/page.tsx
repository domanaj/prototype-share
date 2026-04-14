export default function Home() {
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
    }}>
      <div style={{ textAlign: 'center', maxWidth: 480 }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.03em' }}>
          prototype.share
        </h1>
        <p style={{ color: '#666', fontSize: '1.1rem', marginTop: 8, lineHeight: 1.5 }}>
          Share HTML prototypes. Drop pin comments. Track versions.
        </p>
        <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <a
            href="/upload"
            style={{
              display: 'block',
              padding: '14px 24px',
              background: '#6366f1',
              color: '#fff',
              borderRadius: 10,
              fontSize: '1rem',
              fontWeight: 600,
              textDecoration: 'none',
              transition: 'background 0.15s ease',
            }}
          >
            Upload a prototype →
          </a>
          <code style={{
            display: 'block',
            padding: '10px 20px',
            background: 'rgba(255,255,255,0.05)',
            borderRadius: 8,
            fontSize: '0.85rem',
            color: '#666',
          }}>
            or: prototype-share publish index.html
          </code>
        </div>
      </div>
    </div>
  );
}
