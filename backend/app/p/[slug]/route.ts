import { db, schema } from '@/db';
import { eq, and } from 'drizzle-orm';
import { servePrototype } from '@/lib/serve';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  return servePrototype(slug, undefined, request);
}
