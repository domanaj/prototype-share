import { NextRequest, NextResponse } from 'next/server';
import { getMeta, getComments, addComment } from '@/lib/store';
import { generateReviewerName, randomColor } from '@/lib/slugs';

const COMMENT_BODY_MAX = 10 * 1024;
const SELECTOR_MAX = 500;
const AUTHOR_MAX = 100;

// GET /api/comments?slug=xxx&version=3
export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');
  if (!slug) return NextResponse.json({ error: 'slug is required' }, { status: 400 });

  const versionStr = request.nextUrl.searchParams.get('version');
  const version = versionStr ? parseInt(versionStr) : undefined;

  const comments = await getComments(slug, version);
  return NextResponse.json(comments);
}

// POST /api/comments
export async function POST(request: Request) {
  let body: {
    slug: string;
    version: number;
    selector?: string;
    x: number;
    y: number;
    body: string;
    author?: string;
    color?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.slug) return NextResponse.json({ error: 'slug is required' }, { status: 400 });
  if (typeof body.version !== 'number' || body.version < 1) {
    return NextResponse.json({ error: 'Invalid version' }, { status: 400 });
  }
  if (typeof body.x !== 'number' || body.x < 0 || body.x > 100) {
    return NextResponse.json({ error: 'x must be 0-100' }, { status: 400 });
  }
  if (typeof body.y !== 'number' || body.y < 0 || body.y > 100) {
    return NextResponse.json({ error: 'y must be 0-100' }, { status: 400 });
  }
  if (!body.body || typeof body.body !== 'string') {
    return NextResponse.json({ error: 'Comment body is required' }, { status: 400 });
  }
  if (body.body.length > COMMENT_BODY_MAX) {
    return NextResponse.json({ error: `Body exceeds ${COMMENT_BODY_MAX / 1024}KB` }, { status: 400 });
  }
  if (body.selector && body.selector.length > SELECTOR_MAX) {
    return NextResponse.json({ error: `Selector exceeds ${SELECTOR_MAX} chars` }, { status: 400 });
  }

  const meta = await getMeta(body.slug);
  if (!meta) return NextResponse.json({ error: 'Prototype not found' }, { status: 404 });

  const author = (body.author || '').trim().slice(0, AUTHOR_MAX) || generateReviewerName();
  const color = body.color && /^#[0-9a-fA-F]{6}$/.test(body.color) ? body.color : randomColor();
  const id = crypto.randomUUID();

  const comment = {
    id,
    slug: body.slug,
    version: body.version,
    selector: body.selector || null,
    x: body.x,
    y: body.y,
    body: escapeHtml(body.body),
    author: escapeHtml(author),
    color,
    createdAt: new Date().toISOString(),
  };

  await addComment(body.slug, comment);

  return NextResponse.json({
    ...comment,
    body: body.body,  // return unescaped for display
    author,
  }, { status: 201 });
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
