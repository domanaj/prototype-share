import { NextResponse } from 'next/server';
import { list } from '@vercel/blob';
import { getMeta, getComments } from '@/lib/store';

export async function GET() {
  try {
    // List all meta.json files to find every prototype
    const { blobs } = await list({ limit: 1000 });
    const metaBlobs = blobs.filter(b => b.pathname.endsWith('/meta.json'));

    const prototypes: {
      slug: string;
      latestVersion: number;
      createdAt: string;
      commentCount: number;
    }[] = [];

    for (const blob of metaBlobs) {
      try {
        // Extract slug from pathname: "{slug}/meta.json"
        const slug = blob.pathname.replace(/\/meta\.json$/, '');

        const meta = await getMeta(slug);
        if (!meta) continue;

        const comments = await getComments(slug);
        const commentCount = comments.length + comments.reduce((acc, c) => acc + (c.replies?.length || 0), 0);

        prototypes.push({
          slug: meta.slug,
          latestVersion: meta.latestVersion,
          createdAt: meta.createdAt,
          commentCount,
        });
      } catch { /* skip broken entries */ }
    }

    // Sort newest first
    prototypes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json(prototypes);
  } catch (err: any) {
    return NextResponse.json({ error: err.message, stack: err.stack?.split('\n').slice(0, 3) }, { status: 500 });
  }
}
