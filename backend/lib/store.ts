import { put, list, get } from '@vercel/blob';

// Everything is Vercel Blob (private store). No database.

export interface PrototypeMeta {
  slug: string;
  latestVersion: number;
  createdAt: string;
}

export interface VersionInfo {
  version: number;
  hash: string;
  createdAt: string;
}

export interface Comment {
  id: string;
  slug: string;
  version: number;
  selector: string | null;
  x: number;
  y: number;
  body: string;
  author: string;
  color: string;
  createdAt: string;
  replies?: Reply[];
}

export interface Reply {
  id: string;
  author: string;
  color: string;
  body: string;
  createdAt: string;
}

// ─── Read helper for private blobs ───

async function readBlobText(url: string): Promise<string | null> {
  const result = await get(url, { access: 'private' });
  if (!result || result.statusCode !== 200 || !result.stream) return null;
  const reader = result.stream.getReader();
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const buf = new Uint8Array(chunks.reduce((acc, c) => acc + c.length, 0));
  let offset = 0;
  for (const chunk of chunks) {
    buf.set(chunk, offset);
    offset += chunk.length;
  }
  return new TextDecoder().decode(buf);
}

async function readJson<T>(path: string): Promise<T | null> {
  try {
    const { blobs } = await list({ prefix: path, limit: 1 });
    if (!blobs.length) return null;
    const text = await readBlobText(blobs[0].url);
    if (!text) return null;
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

async function writeJson(path: string, data: unknown): Promise<void> {
  await put(path, JSON.stringify(data), {
    access: 'private',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

// ─── Prototype meta ───

export async function getMeta(slug: string): Promise<PrototypeMeta | null> {
  return readJson<PrototypeMeta>(`${slug}/meta.json`);
}

export async function createOrUpdateMeta(slug: string, latestVersion: number): Promise<PrototypeMeta> {
  const existing = await getMeta(slug);
  const meta: PrototypeMeta = {
    slug,
    latestVersion,
    createdAt: existing?.createdAt || new Date().toISOString(),
  };
  await writeJson(`${slug}/meta.json`, meta);
  return meta;
}

// ─── Versions ───

export async function getVersionInfo(slug: string, version: number): Promise<VersionInfo | null> {
  return readJson<VersionInfo>(`${slug}/v/${version}/info.json`);
}

export async function getLatestHash(slug: string, version: number): Promise<string | null> {
  const info = await getVersionInfo(slug, version);
  return info?.hash || null;
}

export async function createVersion(slug: string, version: number, hash: string, html: string): Promise<void> {
  await put(`${slug}/v/${version}/index.html`, html, {
    access: 'private',
    contentType: 'text/html; charset=utf-8',
    addRandomSuffix: false,
  });

  const info: VersionInfo = { version, hash, createdAt: new Date().toISOString() };
  await writeJson(`${slug}/v/${version}/info.json`, info);
}

export async function listVersions(slug: string): Promise<VersionInfo[]> {
  const { blobs } = await list({ prefix: `${slug}/v/`, limit: 1000 });
  const infoBlobs = blobs.filter(b => b.pathname.endsWith('/info.json'));

  const versions: VersionInfo[] = [];
  for (const blob of infoBlobs) {
    try {
      const text = await readBlobText(blob.url);
      if (text) versions.push(JSON.parse(text) as VersionInfo);
    } catch { /* skip */ }
  }

  return versions.sort((a, b) => b.version - a.version);
}

export async function getHtmlContent(slug: string, version: number): Promise<string | null> {
  const { blobs } = await list({ prefix: `${slug}/v/${version}/index.html`, limit: 1 });
  if (!blobs.length) return null;
  return readBlobText(blobs[0].url);
}

// ─── Comments ───

export async function getComments(slug: string, version?: number): Promise<Comment[]> {
  const all = await readJson<Comment[]>(`${slug}/comments.json`) || [];
  if (version !== undefined) {
    return all.filter(c => c.version === version);
  }
  return all;
}

export async function addComment(slug: string, comment: Comment): Promise<void> {
  const all = await readJson<Comment[]>(`${slug}/comments.json`) || [];
  all.push(comment);
  await writeJson(`${slug}/comments.json`, all);
}

export async function addReply(slug: string, commentId: string, reply: Reply): Promise<boolean> {
  const all = await readJson<Comment[]>(`${slug}/comments.json`) || [];
  const comment = all.find(c => c.id === commentId);
  if (!comment) return false;
  if (!comment.replies) comment.replies = [];
  comment.replies.push(reply);
  await writeJson(`${slug}/comments.json`, all);
  return true;
}
