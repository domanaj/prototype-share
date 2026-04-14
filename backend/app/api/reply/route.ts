import { NextResponse } from 'next/server';
import { addReply } from '@/lib/store';
import { generateReviewerName, randomColor } from '@/lib/slugs';

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      slug: string;
      commentId: string;
      body: string;
      author?: string;
      color?: string;
    };

    if (!body.slug) return NextResponse.json({ error: 'slug required' }, { status: 400 });
    if (!body.commentId) return NextResponse.json({ error: 'commentId required' }, { status: 400 });
    if (!body.body?.trim()) return NextResponse.json({ error: 'reply body required' }, { status: 400 });
    if (body.body.length > 10 * 1024) return NextResponse.json({ error: 'reply too long' }, { status: 400 });

    const author = (body.author || '').trim().slice(0, 100) || generateReviewerName();
    const color = body.color && /^#[0-9a-fA-F]{6}$/.test(body.color) ? body.color : randomColor();
    const id = crypto.randomUUID();

    const reply = {
      id,
      author: escapeHtml(author),
      color,
      body: escapeHtml(body.body),
      createdAt: new Date().toISOString(),
    };

    const ok = await addReply(body.slug, body.commentId, reply);
    if (!ok) return NextResponse.json({ error: 'Comment not found' }, { status: 404 });

    return NextResponse.json({ ...reply, body: body.body, author }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
