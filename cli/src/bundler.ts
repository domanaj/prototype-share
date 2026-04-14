import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import { load } from 'cheerio';

const MIME_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

const MAX_BUNDLE_SIZE = 5 * 1024 * 1024; // 5MB

export interface BundleResult {
  html: string;
  hash: string;
  warnings: string[];
  originalSize: number;
  bundledSize: number;
}

export function bundleHtml(filePath: string): BundleResult {
  const warnings: string[] = [];
  const baseDir = path.dirname(path.resolve(filePath));
  let html = fs.readFileSync(filePath, 'utf-8');

  if (!html.trim()) {
    throw new Error('HTML file is empty');
  }

  const $ = load(html);

  // Inline <link rel="stylesheet"> tags
  $('link[rel="stylesheet"]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href || href.startsWith('http://') || href.startsWith('https://') || href.startsWith('//')) return;
    const cssPath = path.resolve(baseDir, href);
    try {
      let css = fs.readFileSync(cssPath, 'utf-8');
      css = inlineCssUrls(css, path.dirname(cssPath), warnings);
      $(el).replaceWith(`<style>${css}</style>`);
    } catch {
      warnings.push(`Could not inline stylesheet: ${href}`);
    }
  });

  // Inline <script src="..."> tags (not modules, not external)
  $('script[src]').each((_, el) => {
    const src = $(el).attr('src');
    if (!src || src.startsWith('http://') || src.startsWith('https://') || src.startsWith('//')) return;
    const jsPath = path.resolve(baseDir, src);
    try {
      const js = fs.readFileSync(jsPath, 'utf-8');
      $(el).removeAttr('src');
      $(el).html(js);
    } catch {
      warnings.push(`Could not inline script: ${src}`);
    }
  });

  // Inline <img src="..."> as base64
  $('img[src]').each((_, el) => {
    const src = $(el).attr('src');
    if (!src || src.startsWith('data:') || src.startsWith('http://') || src.startsWith('https://') || src.startsWith('//')) return;
    const imgPath = path.resolve(baseDir, src);
    try {
      const buf = fs.readFileSync(imgPath);
      const ext = path.extname(imgPath).toLowerCase();
      const mime = MIME_TYPES[ext] || 'application/octet-stream';
      $(el).attr('src', `data:${mime};base64,${buf.toString('base64')}`);
    } catch {
      warnings.push(`Could not inline image: ${src}`);
    }
  });

  // Inline background-image in inline styles
  $('[style]').each((_, el) => {
    const style = $(el).attr('style');
    if (!style || !style.includes('url(')) return;
    const newStyle = inlineCssUrls(style, baseDir, warnings);
    $(el).attr('style', newStyle);
  });

  const bundled = $.html();
  const originalSize = Buffer.byteLength(html, 'utf-8');
  const bundledSize = Buffer.byteLength(bundled, 'utf-8');

  if (bundledSize > MAX_BUNDLE_SIZE) {
    throw new Error(
      `Bundle size ${(bundledSize / 1024 / 1024).toFixed(1)}MB exceeds ${MAX_BUNDLE_SIZE / 1024 / 1024}MB limit. ` +
      `Try reducing image sizes or using external URLs.`
    );
  }

  const hash = crypto.createHash('sha256').update(bundled).digest('hex').slice(0, 16);

  return { html: bundled, hash, warnings, originalSize, bundledSize };
}

function inlineCssUrls(css: string, baseDir: string, warnings: string[]): string {
  return css.replace(/url\(['"]?([^'")]+)['"]?\)/g, (match, urlPath) => {
    if (urlPath.startsWith('data:') || urlPath.startsWith('http://') || urlPath.startsWith('https://') || urlPath.startsWith('//')) {
      return match;
    }
    const fullPath = path.resolve(baseDir, urlPath);
    try {
      const buf = fs.readFileSync(fullPath);
      const ext = path.extname(fullPath).toLowerCase();
      const mime = MIME_TYPES[ext] || 'application/octet-stream';
      return `url(data:${mime};base64,${buf.toString('base64')})`;
    } catch {
      warnings.push(`Could not inline CSS url: ${urlPath}`);
      return match;
    }
  });
}
