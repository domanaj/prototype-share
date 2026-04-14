import { put, list, head, del } from '@vercel/blob';

// Everything is Vercel Blob. No database.
//
// Layout:
//   {slug}/meta.json          - { slug, latestVersion, createdAt }
//   {slug}/v/{n}/index.html   - the HTML blob
//   {slug}/v/{n}/info.json    - { version, hash, createdAt }
//   {slug}/comments.json      - [ { id, version, selector, x, y, body, author, color, createdAt }, ... ]

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
}

// ─── Read helpers ───

async function readJson<T>(path: string): Promise<T | null> {
  try {
    const { blobs } = await list({ prefix: path, limit: 1 });
    if (!blobs.length) return null;
    const res = await fetch(blobs[0].url);
    if (!res.ok) return null;
    return await res.json() as T;
  } catch {
    return null;
  }
}

async function writeJson(path: string, data: unknown): Promise<void> {
  await put(path, JSON.stringify(data), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
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
  // Write HTML blob
  await put(`${slug}/v/${version}/index.html`, html, {
    access: 'public',
    contentType: 'text/html; charset=utf-8',
    addRandomSuffix: false,
  });

  // Write version info
  const info: VersionInfo = { version, hash, createdAt: new Date().toISOString() };
  await writeJson(`${slug}/v/${version}/info.json`, info);
}

export async function listVersions(slug: string): Promise<VersionInfo[]> {
  const { blobs } = await list({ prefix: `${slug}/v/`, limit: 1000 });
  const infoBlobs = blobs.filter(b => b.pathname.endsWith('/info.json'));

  const versions: VersionInfo[] = [];
  for (const blob of infoBlobs) {
    try {
      const res = await fetch(blob.url);
      if (res.ok) versions.push(await res.json() as VersionInfo);
    } catch { /* skip */ }
  }

  return versions.sort((a, b) => b.version - a.version);
}

export async function getHtmlUrl(slug: string, version: number): Promise<string | null> {
  const { blobs } = await list({ prefix: `${slug}/v/${version}/index.html`, limit: 1 });
  return blobs.length ? blobs[0].url : null;
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
