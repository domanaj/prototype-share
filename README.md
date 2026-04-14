# prototype-share

Share HTML prototypes with versioned URLs and pin comments. Built for teams using Claude Code and AI coding tools.

## The problem

Your team Slacks each other `.html` files. PMs don't open them. Feedback scatters across threads. Nobody knows which version a comment is about.

## The fix

```bash
prototype-share publish
# => https://view.prototype-share.net/bold-falcon-42
```

One command. Shareable URL. Reviewers Shift+click anywhere to drop feedback. Every publish creates an immutable version. Comments persist across versions.

## Install

```bash
npm install -g prototype-share
```

## Usage

```bash
# Publish once
prototype-share publish index.html

# Auto-publish on every save
prototype-share watch index.html

# List versions
prototype-share list bold-falcon-42
```

### Claude Code integration

Copy `claude-code/commands/share.md` into your project's `.claude/commands/` directory. Then use `/share` in Claude Code to publish prototypes.

## How it works

**For engineers (publishers):**
- CLI bundles HTML + CSS + JS + images into a single file
- Uploads to the platform, gets a versioned URL
- Content-hash dedup: re-publishing identical content returns the same URL

**For reviewers (everyone else):**
- Click the URL. See the prototype. That's it.
- Shift+click anywhere to drop a comment pin
- Pins bounce in with elastic animation, pulse gently
- Comments persist across versions with DOM selector anchoring
- No account needed. Anonymous by default.

**Architecture:**
- CLI: Node.js (npm package)
- Backend: Cloudflare Workers + R2 (HTML storage) + D1 (comments, versions)
- Viewer: injected JS/CSS with motion-first interaction design
- XSS isolation: user HTML served from separate origin

## Self-host

```bash
cd backend
cp wrangler.toml.example wrangler.toml  # edit with your Cloudflare account
npm run db:migrate
npm run deploy
```

Then configure the CLI:
```bash
prototype-share config --set-url https://your-api-domain.com
```

## Development

```bash
# CLI
cd cli && npm install && npm run dev

# Backend (requires wrangler)
cd backend && npm install && npm run dev

# Build viewer bundle
./build-viewer.sh
```

## Design decisions

See the full design doc and CEO review in the plan file. Key decisions:

- **Inline single-file:** CLI bundles everything into one HTML blob. Covers 95% of Claude Code output.
- **DOM selector + XY fallback:** Comments anchor to CSS selectors. When selectors break across versions, fall back to XY coordinates with "outdated" badge.
- **Shift+click to comment:** Default clicks run the prototype normally. Modifier key activates comment mode. No mode toggle needed.
- **Motion-first personality:** Bouncy pins, spring animations, shimmer effects. The tool *feels* good.
- **No accounts:** Unguessable slugs for access. Anonymous reviewer identities with persistent colors.

## License

MIT
