import { readFileSync } from 'fs';
import { join } from 'path';

// Read viewer files at module load time (works in both dev and Vercel build)
// Files are copied into lib/ so they're inside the Next.js root directory
const CSS_PATH = join(process.cwd(), 'lib', 'inject.css');
const JS_PATH = join(process.cwd(), 'lib', 'inject.js');

let _css: string | null = null;
let _js: string | null = null;

export function getViewerCSS(): string {
  if (!_css) {
    _css = readFileSync(CSS_PATH, 'utf-8');
  }
  return _css;
}

export function getViewerJS(): string {
  if (!_js) {
    _js = readFileSync(JS_PATH, 'utf-8');
  }
  return _js;
}
