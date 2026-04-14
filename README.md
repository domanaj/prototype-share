# prototype.share 🤖

**Share HTML prototypes with your team. Get feedback with pin comments. Track versions.**

No accounts. No downloads. Just a URL.

**Live:** [prototype-share-olive.vercel.app](https://prototype-share-olive.vercel.app)

---

## What is this?

When someone on your team builds an HTML prototype (in Claude Code, Cursor, or by hand), they can share it instantly as a link. Anyone who opens the link can click on the prototype to leave feedback. Every new version is tracked automatically.

**Before:** Engineer Slacks a `.html` file → PM downloads it → opens locally → types feedback in a thread → nobody knows which version the feedback is about.

**After:** Drop an HTML file on the robot → get a link → PM clicks link → Shift+clicks to pin feedback directly on the prototype → feedback persists across versions.

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

## For anyone: web upload (no install needed)

Go to **[prototype-share-olive.vercel.app/upload](https://prototype-share-olive.vercel.app/upload)**

Drag and drop an HTML file onto the robot. It chomps your file (NOM CHOMP MUNCH CRUNCH) and gives you a shareable link. Upload the same filename again and it creates v2, v3, etc.

### HTML Robot Factory

Browse everything your team has shared at the **[HTML Robot Factory](https://prototype-share-olive.vercel.app/gallery)**.

Every prototype shows up as a card with a live preview, version number, and comment count. Hover the ↑ button on any card to upload a new version directly from the gallery.

---

## For engineers: CLI

### First-time setup (2 minutes)

```bash
git clone https://github.com/domanaj/prototype-share.git
cd prototype-share/cli
npm install
npm run build
npm link
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

Paste that URL anywhere. Done.

### Update an existing prototype

Just publish again. If the content changed, it creates v2:

```bash
prototype-share publish index.html
```

Same URL, new version. If nothing changed, it tells you.

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

If you use Claude Code, you can publish with a slash command:

```bash
mkdir -p .claude/commands
cp ~/prototype-share/claude-code/commands/share.md .claude/commands/
```

Then type `/share` in Claude Code to publish.

---

## How it works

```
  You                          Server (Vercel)              Reviewer
  ───                          ───────────────              ────────
  Drop HTML on robot      ──→  Stores it, returns URL  ──→  Opens URL
  (or CLI publish)              Injects comment layer        Shift+clicks to comment
                                                             Comments saved

  Upload same file again  ──→  Creates v2, keeps v1   ──→   Sees v2, old comments
                                Comments carry over          marked if element moved
```

- **Web upload** at `/upload` — drag and drop onto the robot, it chomps and publishes
- **Gallery** at `/gallery` — browse all prototypes with live previews, upload new versions from any card
- **CLI** bundles HTML + CSS + JS + images into one file and uploads it
- **Server** stores each version in Vercel Blob. Injects a comment layer when viewed.
- **Comments** are pinned to spots on the page. If the page changes, pins try to follow. If they can't, they show an "outdated" badge.
- **Versioning** — same filename = new version. CLI tracks slugs automatically. Web upload remembers per filename.
- **No database.** Everything stored in Vercel Blob.
- **No accounts.** URLs are unguessable. Reviewers stay anonymous or type a name.
- **Electric Purple** theme. Because robots deserve good design.

---

## Pages

| URL | What it does |
|-----|-------------|
| `/` | Landing page |
| `/upload` | Drag and drop HTML onto the robot to publish |
| `/gallery` | HTML Robot Factory — browse all prototypes, upload new versions |
| `/p/{slug}` | View a prototype with comment layer |
| `/p/{slug}/v/{n}` | View a specific version |

---

## FAQ

**Q: Do reviewers need to install anything?**
No. They just click the link.

**Q: Does normal clicking still work on the prototype?**
Yes. Regular clicks work normally (buttons, links, forms). Only **Shift+click** drops a comment pin.

**Q: What happens to comments when I publish a new version?**
They carry over. If the element a comment was pinned to still exists, the pin stays in place. If it was deleted, the pin shows an "outdated" badge.

**Q: How do I upload a new version?**
Three ways: (1) upload the same filename on the web upload page, (2) click the ↑ button on any card in the gallery, (3) run `prototype-share publish` again from the CLI.

**Q: Can I use this with React/Vue/Next.js projects?**
Right now it works with standalone HTML files. If your project uses a dev server, export the page as HTML first.

**Q: Is this only for Claude Code?**
No. It works with any HTML file. The web upload doesn't require any tools at all.

---

## Deploying your own instance

1. Fork this repo
2. Create a Vercel project (set root directory to `backend`)
3. Add Blob storage: Project → Storage → Create → Blob
4. Deploy

Then point the CLI or tell your team to use your URL.

---

## Development

```bash
# CLI
cd cli && npm install && npm run dev

# Backend
cd backend && npm install && npm run dev
```

---

## License

MIT
