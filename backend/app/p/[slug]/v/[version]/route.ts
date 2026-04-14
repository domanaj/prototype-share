import { servePrototype } from '@/lib/serve';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string; version: string }> }
) {
  const { slug, version } = await params;
  return servePrototype(slug, parseInt(version), request);
}
