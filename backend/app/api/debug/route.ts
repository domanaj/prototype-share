import { NextResponse } from 'next/server';
import { list } from '@vercel/blob';

export async function GET() {
  try {
    const { blobs } = await list({ limit: 50 });
    return NextResponse.json({
      count: blobs.length,
      blobs: blobs.map(b => ({
        pathname: b.pathname,
        url: b.url,
        downloadUrl: b.downloadUrl,
        size: b.size,
      })),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
