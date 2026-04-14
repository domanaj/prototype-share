import { NextResponse } from 'next/server';
import { list } from '@vercel/blob';

export async function GET() {
  try {
    const { blobs } = await list({ limit: 1000 });
    const totalPrototypes = blobs.filter(b => b.pathname.endsWith('/meta.json')).length;
    const totalVersions = blobs.filter(b => b.pathname.endsWith('/info.json')).length;
    return NextResponse.json({ totalPrototypes, totalVersions });
  } catch (err: any) {
    return NextResponse.json({ totalPrototypes: 0, totalVersions: 0 });
  }
}
