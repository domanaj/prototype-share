import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { bundleHtml } from './bundler';

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ps-test-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function writeFile(name: string, content: string) {
  fs.writeFileSync(path.join(tmpDir, name), content);
}

function writeFileBuf(name: string, content: Buffer) {
  fs.writeFileSync(path.join(tmpDir, name), content);
}

describe('bundleHtml', () => {
  it('bundles a simple HTML file unchanged', () => {
    writeFile('index.html', '<html><body><h1>Hello</h1></body></html>');
    const result = bundleHtml(path.join(tmpDir, 'index.html'));
    expect(result.html).toContain('<h1>Hello</h1>');
    expect(result.hash).toHaveLength(16);
    expect(result.warnings).toHaveLength(0);
  });

  it('inlines a local CSS file', () => {
    writeFile('style.css', 'body { color: red; }');
    writeFile('index.html', '<html><head><link rel="stylesheet" href="style.css"></head><body></body></html>');
    const result = bundleHtml(path.join(tmpDir, 'index.html'));
    expect(result.html).toContain('<style>body { color: red; }</style>');
    expect(result.html).not.toContain('link rel="stylesheet"');
  });

  it('inlines a local JS file', () => {
    writeFile('app.js', 'console.log("hello");');
    writeFile('index.html', '<html><body><script src="app.js"></script></body></html>');
    const result = bundleHtml(path.join(tmpDir, 'index.html'));
    expect(result.html).toContain('console.log("hello")');
    expect(result.html).not.toContain('src="app.js"');
  });

  it('inlines a local image as base64', () => {
    // Create a tiny 1x1 PNG
    const pngBuf = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );
    writeFileBuf('pixel.png', pngBuf);
    writeFile('index.html', '<html><body><img src="pixel.png"></body></html>');
    const result = bundleHtml(path.join(tmpDir, 'index.html'));
    expect(result.html).toContain('data:image/png;base64,');
    expect(result.html).not.toContain('src="pixel.png"');
  });

  it('skips external URLs (http/https)', () => {
    writeFile('index.html', `
      <html><head>
        <link rel="stylesheet" href="https://cdn.example.com/style.css">
      </head><body>
        <script src="https://cdn.example.com/app.js"></script>
        <img src="https://cdn.example.com/img.png">
      </body></html>
    `);
    const result = bundleHtml(path.join(tmpDir, 'index.html'));
    expect(result.html).toContain('https://cdn.example.com/style.css');
    expect(result.html).toContain('https://cdn.example.com/app.js');
    expect(result.html).toContain('https://cdn.example.com/img.png');
  });

  it('warns on missing local files', () => {
    writeFile('index.html', '<html><head><link rel="stylesheet" href="missing.css"></head><body></body></html>');
    const result = bundleHtml(path.join(tmpDir, 'index.html'));
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain('missing.css');
  });

  it('throws on empty HTML file', () => {
    writeFile('index.html', '');
    expect(() => bundleHtml(path.join(tmpDir, 'index.html'))).toThrow('HTML file is empty');
  });

  it('throws on oversized bundle', () => {
    // Create a file that will exceed 5MB when bundled
    const bigContent = 'x'.repeat(6 * 1024 * 1024);
    writeFile('index.html', `<html><body>${bigContent}</body></html>`);
    expect(() => bundleHtml(path.join(tmpDir, 'index.html'))).toThrow('exceeds');
  });

  it('produces deterministic hashes for identical content', () => {
    writeFile('index.html', '<html><body><p>test</p></body></html>');
    const r1 = bundleHtml(path.join(tmpDir, 'index.html'));
    const r2 = bundleHtml(path.join(tmpDir, 'index.html'));
    expect(r1.hash).toBe(r2.hash);
  });

  it('produces different hashes for different content', () => {
    writeFile('a.html', '<html><body><p>version 1</p></body></html>');
    writeFile('b.html', '<html><body><p>version 2</p></body></html>');
    const r1 = bundleHtml(path.join(tmpDir, 'a.html'));
    const r2 = bundleHtml(path.join(tmpDir, 'b.html'));
    expect(r1.hash).not.toBe(r2.hash);
  });

  it('inlines CSS url() references', () => {
    const pngBuf = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );
    writeFileBuf('bg.png', pngBuf);
    writeFile('style.css', 'body { background: url(bg.png); }');
    writeFile('index.html', '<html><head><link rel="stylesheet" href="style.css"></head><body></body></html>');
    const result = bundleHtml(path.join(tmpDir, 'index.html'));
    expect(result.html).toContain('data:image/png;base64,');
  });
});
