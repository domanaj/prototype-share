import { NextRequest, NextResponse } from 'next/server';

// Allowed IPs (comma-separated env var). Only checked when flag is on.
function getAllowedIPs(): string[] {
  const raw = process.env.ALLOWED_IPS || '';
  return raw.split(',').map(ip => ip.trim()).filter(Boolean);
}

function getClientIP(request: NextRequest): string {
  // Vercel sets this header
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const real = request.headers.get('x-real-ip');
  if (real) return real.trim();
  return '';
}

export function middleware(request: NextRequest) {
  // Check if IP restriction is enabled via env var (flag controls this)
  const ipRestrictionEnabled = process.env.FLAG_IP_RESTRICTION === 'true';

  if (!ipRestrictionEnabled) {
    return NextResponse.next();
  }

  // Skip health check
  if (request.nextUrl.pathname === '/health') {
    return NextResponse.next();
  }

  const clientIP = getClientIP(request);
  const allowed = getAllowedIPs();

  if (allowed.length === 0) {
    // No IPs configured, allow all (misconfiguration safety)
    return NextResponse.next();
  }

  if (allowed.includes(clientIP)) {
    return NextResponse.next();
  }

  // Blocked
  return new NextResponse(
    `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Access Denied</title>
<style>body{font-family:'SF Mono','Fira Code',monospace;background:#0a0a0a;color:#e0e0e0;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
.c{text-align:center;max-width:400px}h1{color:#8B5CF6;font-size:1.5rem;letter-spacing:0.1em}p{color:#555;font-size:0.85rem;line-height:1.6}code{background:rgba(139,92,246,0.1);padding:2px 8px;border-radius:4px;color:#8B5CF6;font-size:0.8rem}</style>
</head><body><div class="c">
<h1>ACCESS DENIED</h1>
<p>This prototype viewer is restricted to the internal network.</p>
<p>Connect to the VPN and try again.</p>
<p style="margin-top:24px;color:#333;font-size:0.7rem">Your IP: <code>${clientIP}</code></p>
</div></body></html>`,
    {
      status: 403,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    }
  );
}

export const config = {
  matcher: [
    // Match everything except static files and Next.js internals
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
