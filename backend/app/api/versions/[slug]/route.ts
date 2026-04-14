import { NextResponse } from 'next/server';
import { getMeta, listVersions } from '@/lib/store';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const meta = await getMeta(slug);
  if (!meta) return NextResponse.json({ error: 'Prototype not found' }, { status: 404 });

  const versions = await listVersions(slug);
  return NextResponse.json(versions);
}
