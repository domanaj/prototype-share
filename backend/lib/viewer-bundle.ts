import { readFileSync } from 'fs';
import { join } from 'path';

// In production, these are read at build time and bundled
// For development, they're read from the viewer/ directory
let _css: string | null = null;
let _js: string | null = null;

export function getViewerCSS(): string {
  if (!_css) {
    try {
      _css = readFileSync(join(process.cwd(), '..', 'viewer', 'inject.css'), 'utf-8');
    } catch {
      _css = '/* viewer CSS not found */';
    }
  }
  return _css;
}

export function getViewerJS(): string {
  if (!_js) {
    try {
      _js = readFileSync(join(process.cwd(), '..', 'viewer', 'inject.js'), 'utf-8');
    } catch {
      _js = '/* viewer JS not found */';
    }
  }
  return _js;
}
