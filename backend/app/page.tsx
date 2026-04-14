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
        <code style={{
          display: 'block',
          marginTop: 32,
          padding: '12px 20px',
          background: 'rgba(255,255,255,0.05)',
          borderRadius: 8,
          fontSize: '0.9rem',
          color: '#a5b4fc',
        }}>
          npx prototype-share publish index.html
        </code>
      </div>
    </div>
  );
}
