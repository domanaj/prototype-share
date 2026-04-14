# prototype.share

**Share HTML prototypes with your team. Get feedback with pin comments. Track versions.**

No accounts. No downloads. Just a URL.

---

## What is this?

When someone on your team builds an HTML prototype (in Claude Code, Cursor, or by hand), they can share it instantly as a link. Anyone who opens the link can click on the prototype to leave feedback. Every new version is tracked automatically.

**Before:** Engineer Slacks a `.html` file → PM downloads it → opens locally → types feedback in a Slack thread → nobody knows which version the feedback is about.

**After:** Engineer runs one command → gets a link → PM clicks link → Shift+clicks to pin feedback directly on the prototype → feedback persists across versions.

---

## For reviewers (PMs, designers, anyone)

You don't need to install anything.

1. Someone sends you a link (looks like `https://prototype-share-olive.vercel.app/p/bold-falcon-42`)
2. Click the link. The prototype opens in your browser.
3. Hold **Shift** and click anywhere on the page to drop a comment pin.
4. Type your feedback and click "Post comment."

That's it. Your comments are saved. If the engineer publishes a new version, your comments carry over.

- No account needed
- No app to install
- Works on any device with a browser

---

## For engineers (publishing prototypes)

### First-time setup (takes 2 minutes)

```bash
git clone https://github.com/domanaj/prototype-share.git
cd prototype-share/cli
npm install
npm run build
npm link
```

Then tell the CLI where your team's server is:

```bash
prototype-share config --set-url https://prototype-share-olive.vercel.app
```

### Publish a prototype

```bash
prototype-share publish index.html
```

You'll see:

```
Bundling index.html...
  12KB -> 15KB bundled
Publishing...

Published v1!

  https://prototype-share-olive.vercel.app/p/bold-falcon-42

  (copied to clipboard)
```

Paste that URL in Slack. Done.

### Auto-publish on every save

If you're iterating with Claude Code (or any editor), use watch mode. It republishes every time the file changes:

```bash
prototype-share watch index.html
```

The URL stays the same. Viewers always see the latest version.

### See all versions

```bash
prototype-share list bold-falcon-42
```

### Claude Code integration

If you use Claude Code, you can publish with a slash command. Copy the command file into your project:

```bash
mkdir -p .claude/commands
cp ~/prototype-share/claude-code/commands/share.md .claude/commands/
```

Then type `/share` in Claude Code to publish.

---

## How it works

```
  You (engineer)              Server (Vercel)              Reviewer (PM/designer)
  ──────────────              ───────────────              ─────────────────────
  prototype-share publish ──→ Bundles HTML into            Opens URL in browser
                              one file, stores it    ──→   Sees the prototype
                              Returns a URL                Shift+clicks to comment
                                                           Comments saved to server
  prototype-share publish ──→ Creates v2, keeps v1         Sees v2, old comments
  (after editing)             Comments carry over          marked if moved
```

- **CLI** bundles your HTML + CSS + JS + images into a single file and uploads it.
- **Server** stores each version. Injects a thin comment layer on top of your prototype when someone views it.
- **Comments** are pinned to specific spots on the page. If the page changes in a new version, pins try to follow. If they can't, they show an "outdated" badge.
- **No database.** Everything stored in Vercel Blob (simple file storage).
- **No accounts.** URLs are unguessable (like Google Docs "anyone with the link" sharing). Reviewers pick a name when they first comment (or stay anonymous).

---

## FAQ

**Q: Do reviewers need to install anything?**
No. They just click the link.

**Q: Does normal clicking still work on the prototype?**
Yes. Regular clicks work normally (buttons, links, forms all work). Only **Shift+click** drops a comment pin.

**Q: What happens to comments when I publish a new version?**
They carry over. If the element a comment was pinned to still exists, the pin stays in place. If it moved or was deleted, the pin shows an "outdated" badge.

**Q: Can I use this with React/Vue/Next.js projects?**
Right now it works with standalone HTML files. If your project uses a framework with a dev server (localhost:3000), export the page as HTML first, then publish that.

**Q: Is this only for Claude Code?**
No. It works with any HTML file, however you made it. Claude Code just happens to produce a lot of `.html` prototypes.

**Q: How do I point this at a different server?**
```bash
prototype-share config --set-url https://your-server.vercel.app
```

---

## Deploying your own server

If you want your own instance (recommended for teams):

1. Fork this repo
2. Create a Vercel project from the fork (set root directory to `backend`)
3. Add Blob storage: Project → Storage → Create → Blob
4. Deploy

The CLI defaults to your Vercel URL once you run `prototype-share config --set-url`.

---

## Development

```bash
# CLI (in one terminal)
cd cli && npm install && npm run dev

# Backend (in another terminal)
cd backend && npm install && npm run dev
```

---

## License

MIT
