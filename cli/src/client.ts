import { loadConfig } from './config.js';

export interface PublishResponse {
  url: string;
  slug: string;
  version: number;
  deduplicated: boolean;
}

export interface Comment {
  id: string;
  version: number;
  selector: string;
  x: number;
  y: number;
  body: string;
  author: string;
  createdAt: string;
}

export class ApiClient {
  private baseUrl: string;
  private apiKey?: string;

  constructor() {
    const config = loadConfig();
    this.baseUrl = config.apiUrl;
    this.apiKey = config.apiKey;
  }

  async publish(html: string, hash: string, slug?: string): Promise<PublishResponse> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const res = await this.fetchWithRetry(`${this.baseUrl}/api/publish`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ html, hash, slug }),
    });

    if (res.status === 409) {
      const data = await res.json() as PublishResponse;
      return { ...data, deduplicated: true };
    }

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Publish failed (${res.status}): ${text}`);
    }

    const data = await res.json() as PublishResponse;
    return { ...data, deduplicated: false };
  }

  async listVersions(slug: string): Promise<{ version: number; createdAt: string; hash: string }[]> {
    const res = await fetch(`${this.baseUrl}/api/versions/${slug}`);
    if (!res.ok) throw new Error(`Failed to list versions (${res.status})`);
    return res.json() as any;
  }

  private async fetchWithRetry(url: string, init: RequestInit, retries = 3): Promise<Response> {
    let lastError: Error | undefined;
    for (let i = 0; i < retries; i++) {
      try {
        const res = await fetch(url, { ...init, signal: AbortSignal.timeout(30000) });
        if (res.status >= 500 && i < retries - 1) {
          await sleep(Math.pow(2, i) * 1000);
          continue;
        }
        return res;
      } catch (err) {
        lastError = err as Error;
        if (i < retries - 1) {
          process.stderr.write(`Retrying (${i + 1}/${retries})...\n`);
          await sleep(Math.pow(2, i) * 1000);
        }
      }
    }
    throw lastError ?? new Error('Request failed after retries');
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
