import { getMeta, getHtmlContent } from './store';
import { getViewerCSS, getViewerJS } from './viewer-bundle';

export async function servePrototype(
  slug: string,
  requestedVersion: number | undefined,
  request: Request
): Promise<Response> {
  const meta = await getMeta(slug);

  if (!meta) {
    return new Response(notFoundPage(slug), {
      status: 404,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  const version = requestedVersion ?? meta.latestVersion;

  // Fetch HTML from Vercel Blob (private store)
  let html = await getHtmlContent(slug, version);

  if (!html) {
    if (version > 1) {
      return servePrototype(slug, version - 1, request);
    }
    return new Response(notFoundPage(slug), {
      status: 404,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  const apiOrigin = new URL(request.url).origin;
  html = injectViewer(html, slug, version, meta.latestVersion, apiOrigin);

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': requestedVersion
        ? 'public, max-age=31536000, immutable'
        : 'public, max-age=10',
    },
  });
}

function injectViewer(
  html: string,
  slug: string,
  version: number,
  latestVersion: number,
  apiOrigin: string
): string {
  const config = JSON.stringify({ slug, version, latestVersion, apiOrigin });
  const css = getViewerCSS();
  const js = getViewerJS();

  const injection = `
<style>${css}</style>
<script>
window.__PROTOTYPE_SHARE__ = ${config};
${js}
</script>`;

  if (html.includes('</body>')) {
    return html.replace('</body>', `${injection}\n</body>`);
  }
  if (html.includes('</html>')) {
    return html.replace('</html>', `${injection}\n</html>`);
  }
  return html + injection;
}

function notFoundPage(slug: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Not Found</title>
<style>body{font-family:system-ui,-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#0a0a0a;color:#e0e0e0}
.c{text-align:center}h1{font-size:1.5rem;font-weight:600}p{color:#666;margin-top:.5rem}</style>
</head><body><div class="c"><h1>Prototype not found</h1><p>"${slug}" doesn't exist or has been removed.</p></div></body></html>`;
}
