import { NextResponse } from 'next/server';
import { getMeta, getLatestHash, createVersion, createOrUpdateMeta } from '@/lib/store';
import { generateSlug } from '@/lib/slugs';

export async function POST(request: Request) {
  let body: { html: string; hash: string; slug?: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.html || typeof body.html !== 'string') {
    return NextResponse.json({ error: 'Missing or invalid html field' }, { status: 400 });
  }
  if (!body.hash || typeof body.hash !== 'string') {
    return NextResponse.json({ error: 'Missing or invalid hash field' }, { status: 400 });
  }
  if (body.html.length > 5 * 1024 * 1024) {
    return NextResponse.json({ error: 'HTML exceeds 5MB limit' }, { status: 413 });
  }

  const slug = body.slug || generateSlug();
  const meta = await getMeta(slug);

  let version: number;

  if (meta) {
    // Dedup: same hash as latest version?
    const latestHash = await getLatestHash(slug, meta.latestVersion);
    if (latestHash === body.hash) {
      const baseUrl = process.env.NEXT_PUBLIC_VIEW_URL || new URL(request.url).origin;
      return NextResponse.json({
        url: `${baseUrl}/p/${slug}`,
        slug,
        version: meta.latestVersion,
        deduplicated: true,
      }, { status: 409 });
    }
    version = meta.latestVersion + 1;
  } else {
    version = 1;
  }

  // Write HTML + version info to blob
  await createVersion(slug, version, body.hash, body.html);

  // Update meta
  await createOrUpdateMeta(slug, version);

  const baseUrl = process.env.NEXT_PUBLIC_VIEW_URL || new URL(request.url).origin;
  return NextResponse.json({
    url: `${baseUrl}/p/${slug}`,
    slug,
    version,
    deduplicated: false,
  }, { status: 201 });
}
