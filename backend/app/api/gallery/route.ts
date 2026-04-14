import { NextResponse } from 'next/server';
import { list, get } from '@vercel/blob';

export async function GET() {
  try {
    // List all meta.json files to find all prototypes
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
        const result = await get(blob.url, { access: 'private' });
        if (!result || result.statusCode !== 200 || !result.stream) continue;
        const reader = result.stream.getReader();
        const chunks: Uint8Array[] = [];
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
        }
        const buf = new Uint8Array(chunks.reduce((acc, c) => acc + c.length, 0));
        let offset = 0;
        for (const chunk of chunks) { buf.set(chunk, offset); offset += chunk.length; }
        const meta = JSON.parse(new TextDecoder().decode(buf));

        // Try to get comment count
        let commentCount = 0;
        const commentBlobs = blobs.filter(b => b.pathname === `${meta.slug}/comments.json`);
        if (commentBlobs.length) {
          try {
            const cResult = await get(commentBlobs[0].url, { access: 'private' });
            if (cResult && cResult.statusCode === 200 && cResult.stream) {
              const cReader = cResult.stream.getReader();
              const cChunks: Uint8Array[] = [];
              while (true) {
                const { done, value } = await cReader.read();
                if (done) break;
                cChunks.push(value);
              }
              const cBuf = new Uint8Array(cChunks.reduce((acc, c) => acc + c.length, 0));
              let cOff = 0;
              for (const chunk of cChunks) { cBuf.set(chunk, cOff); cOff += chunk.length; }
              const comments = JSON.parse(new TextDecoder().decode(cBuf));
              commentCount = Array.isArray(comments) ? comments.length : 0;
            }
          } catch { /* no comments */ }
        }

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
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
