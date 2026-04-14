#!/usr/bin/env node

import { program } from 'commander';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { bundleHtml } from './bundler.js';
import { ApiClient } from './client.js';
import { loadConfig, saveConfig, incrementPublishCount } from './config.js';

program
  .name('prototype-share')
  .description('Share HTML prototypes with versioned URLs and pin comments')
  .version('0.1.0');

program
  .command('publish')
  .description('Publish an HTML prototype and get a shareable URL')
  .argument('[file]', 'HTML file to publish', 'index.html')
  .option('-s, --slug <slug>', 'Reuse an existing prototype slug')
  .action(async (file: string, opts: { slug?: string }) => {
    const filePath = path.resolve(file);

    if (!fs.existsSync(filePath)) {
      console.error(`No HTML file found at ${filePath}`);
      console.error(`Specify a file: prototype-share publish my-prototype.html`);
      process.exit(1);
    }

    console.log(`Bundling ${path.basename(filePath)}...`);
    const bundle = bundleHtml(filePath);

    for (const w of bundle.warnings) {
      console.warn(`  warning: ${w}`);
    }

    const sizeMB = (bundle.bundledSize / 1024 / 1024).toFixed(2);
    console.log(`  ${(bundle.originalSize / 1024).toFixed(0)}KB -> ${(bundle.bundledSize / 1024).toFixed(0)}KB bundled (${sizeMB}MB)`);

    console.log('Publishing...');
    const client = new ApiClient();
    const result = await client.publish(bundle.html, bundle.hash, opts.slug);

    if (result.deduplicated) {
      console.log(`\nAlready published as v${result.version}, nothing changed.`);
    } else {
      console.log(`\nPublished v${result.version}!`);
    }

    console.log(`\n  ${result.url}\n`);

    // Copy to clipboard if possible
    try {
      const { execSync } = await import('node:child_process');
      if (process.platform === 'darwin') {
        execSync(`echo -n '${result.url}' | pbcopy`);
        console.log('  (copied to clipboard)');
      }
    } catch {
      // clipboard not available, that's fine
    }

    // Track publish count (lazy API key prompt after 10)
    const config = incrementPublishCount();
    if (config.publishCount === 10 && !config.apiKey) {
      console.log('\n  Tip: You\'ve published 10 prototypes! Consider setting an API key');
      console.log('  for security: prototype-share config --set-key <your-key>\n');
    }

    // Save slug for reuse
    const slugFile = path.join(path.dirname(filePath), '.prototype-share-slug');
    fs.writeFileSync(slugFile, result.slug);
  });

program
  .command('watch')
  .description('Auto-publish on every HTML file save')
  .argument('[file]', 'HTML file to watch', 'index.html')
  .option('-s, --slug <slug>', 'Reuse an existing prototype slug')
  .action(async (file: string, opts: { slug?: string }) => {
    const filePath = path.resolve(file);

    if (!fs.existsSync(filePath)) {
      console.error(`No HTML file found at ${filePath}`);
      process.exit(1);
    }

    // Read slug from .prototype-share-slug if exists
    const slugFile = path.join(path.dirname(filePath), '.prototype-share-slug');
    let slug = opts.slug;
    if (!slug && fs.existsSync(slugFile)) {
      slug = fs.readFileSync(slugFile, 'utf-8').trim();
    }

    console.log(`Watching ${path.basename(filePath)} for changes...`);
    console.log('Press Ctrl+C to stop.\n');

    // Initial publish
    await publishOnce(filePath, slug);

    // Watch for changes
    const { watch } = await import('chokidar');
    const dir = path.dirname(filePath);
    const watcher = watch(dir, {
      ignoreInitial: true,
      ignored: /(^|[\/\\])\../, // ignore dotfiles
    });

    let debounce: ReturnType<typeof setTimeout> | null = null;

    watcher.on('change', (changedPath) => {
      // Only re-publish for HTML, CSS, JS, image changes
      const ext = path.extname(changedPath).toLowerCase();
      if (!['.html', '.css', '.js', '.ts', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'].includes(ext)) return;

      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(async () => {
        console.log(`\nChange detected: ${path.relative(dir, changedPath)}`);
        // Read slug from file (may have been created by first publish)
        if (!slug && fs.existsSync(slugFile)) {
          slug = fs.readFileSync(slugFile, 'utf-8').trim();
        }
        await publishOnce(filePath, slug);
      }, 500);
    });
  });

program
  .command('list')
  .description('List versions for a prototype')
  .argument('<slug>', 'Prototype slug')
  .action(async (slug: string) => {
    const client = new ApiClient();
    const versions = await client.listVersions(slug);

    console.log(`\nVersions for ${slug}:\n`);
    for (const v of versions) {
      const date = new Date(v.createdAt).toLocaleString();
      console.log(`  v${v.version}  ${date}  ${v.hash}`);
    }
    console.log();
  });

program
  .command('config')
  .description('Configure prototype-share')
  .option('--set-key <key>', 'Set API key')
  .option('--set-url <url>', 'Set API URL')
  .option('--show', 'Show current config')
  .action((opts: { setKey?: string; setUrl?: string; show?: boolean }) => {
    const config = loadConfig();

    if (opts.setKey) {
      config.apiKey = opts.setKey;
      saveConfig(config);
      console.log('API key saved.');
      return;
    }

    if (opts.setUrl) {
      config.apiUrl = opts.setUrl;
      saveConfig(config);
      console.log(`API URL set to ${opts.setUrl}`);
      return;
    }

    if (opts.show) {
      console.log(JSON.stringify(config, null, 2));
      return;
    }

    console.log('Use --set-key, --set-url, or --show');
  });

async function publishOnce(filePath: string, slug?: string): Promise<void> {
  try {
    const bundle = bundleHtml(filePath);
    for (const w of bundle.warnings) {
      console.warn(`  warning: ${w}`);
    }

    const client = new ApiClient();
    const result = await client.publish(bundle.html, bundle.hash, slug);

    if (result.deduplicated) {
      console.log(`  No changes (still v${result.version})`);
    } else {
      console.log(`  Published v${result.version}: ${result.url}`);
    }

    // Save slug
    const slugFile = path.join(path.dirname(filePath), '.prototype-share-slug');
    fs.writeFileSync(slugFile, result.slug);
  } catch (err) {
    console.error(`  Publish failed: ${(err as Error).message}`);
  }
}

program.parse();
