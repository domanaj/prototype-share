// Prototype Share Viewer — injected into served HTML
// All globals wrapped in IIFE, all DOM in shadow-safe containers

(function() {
  'use strict';

  const CONFIG = window.__PROTOTYPE_SHARE__;
  if (!CONFIG) return;

  const { slug, version, latestVersion, apiOrigin } = CONFIG;
  const API = `${apiOrigin}/api`;

  let comments = [];
  let sidebarOpen = false;
  let activePopup = null;
  let pinCounter = 0;

  // ─── Identity ───
  function getIdentity() {
    const stored = localStorage.getItem('ps-identity');
    if (stored) return JSON.parse(stored);
    return null;
  }

  function setIdentity(name, color) {
    localStorage.setItem('ps-identity', JSON.stringify({ name, color }));
  }

  // ─── CSS Selector for element ───
  function selectorFor(el) {
    if (el.id) return `#${CSS.escape(el.id)}`;
    const parts = [];
    let current = el;
    while (current && current !== document.body && current !== document.documentElement) {
      if (current.id) { parts.unshift(`#${CSS.escape(current.id)}`); break; }
      let selector = current.tagName.toLowerCase();
      if (current.className && typeof current.className === 'string') {
        const classes = current.className.split(/\s+/).filter(c => c && !c.startsWith('ps-'));
        if (classes.length) selector += '.' + classes.map(CSS.escape).join('.');
      }
      const parent = current.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter(c => c.tagName === current.tagName);
        if (siblings.length > 1) {
          const idx = siblings.indexOf(current) + 1;
          selector += `:nth-of-type(${idx})`;
        }
      }
      parts.unshift(selector);
      current = current.parentElement;
    }
    return parts.join(' > ');
  }

  // ─── Top Bar ───
  function createTopBar() {
    const bar = document.createElement('div');
    bar.className = 'ps-topbar';
    bar.setAttribute('data-viewer-ignore', 'true');

    bar.innerHTML = `
      <span class="ps-logo">prototype.share</span>
      <span class="ps-version-badge">v<span class="ps-version-num">${version}</span></span>
      <select class="ps-version-select" title="Switch version"></select>
      <span class="ps-comment-count" title="Toggle comment sidebar">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M2 2h12a1 1 0 011 1v8a1 1 0 01-1 1H5l-3 3V3a1 1 0 011-1z"/></svg>
        <span class="ps-comment-count-num">0</span>
      </span>
      <span class="ps-hint"><kbd>Shift</kbd>+click to comment</span>
    `;

    document.body.appendChild(bar);
    document.body.style.paddingTop = '40px';

    // Populate version dropdown
    const select = bar.querySelector('.ps-version-select');
    for (let v = latestVersion; v >= 1; v--) {
      const opt = document.createElement('option');
      opt.value = v;
      opt.textContent = `v${v}${v === latestVersion ? ' (latest)' : ''}`;
      opt.selected = v === version;
      select.appendChild(opt);
    }

    select.addEventListener('change', (e) => {
      const newVersion = e.target.value;
      const base = window.location.pathname.split('/v/')[0].replace(/\/$/, '');
      window.location.href = `${base}/v/${newVersion}`;
    });

    // Toggle sidebar
    bar.querySelector('.ps-comment-count').addEventListener('click', () => {
      toggleSidebar();
    });

    return bar;
  }

  // ─── Update comment count with animation ───
  function updateCommentCount(count) {
    const el = document.querySelector('.ps-comment-count-num');
    if (!el) return;
    const old = parseInt(el.textContent || '0');
    if (count === old) return;
    el.style.transition = 'transform 0.2s ease, opacity 0.2s ease';
    el.style.transform = 'translateY(-8px)';
    el.style.opacity = '0';
    setTimeout(() => {
      el.textContent = count;
      el.style.transform = 'translateY(8px)';
      requestAnimationFrame(() => {
        el.style.transform = 'translateY(0)';
        el.style.opacity = '1';
      });
    }, 200);
  }

  // ─── Comment sidebar ───
  function toggleSidebar() {
    const existing = document.querySelector('.ps-sidebar');
    if (existing) {
      existing.style.transform = 'translateX(100%)';
      existing.style.opacity = '0';
      setTimeout(() => existing.remove(), 300);
      sidebarOpen = false;
      return;
    }
    sidebarOpen = true;
    const sidebar = document.createElement('div');
    sidebar.className = 'ps-sidebar';
    sidebar.setAttribute('data-viewer-ignore', 'true');

    const header = document.createElement('div');
    header.className = 'ps-sidebar-header';
    header.innerHTML = `
      <span class="ps-sidebar-title">Comments (${comments.length})</span>
      <button class="ps-sidebar-close" title="Close">&times;</button>
    `;
    header.querySelector('.ps-sidebar-close').addEventListener('click', toggleSidebar);
    sidebar.appendChild(header);

    if (comments.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'ps-empty';
      empty.innerHTML = `<p class="ps-empty-text">No comments yet.<br><kbd>Shift</kbd>+click anywhere to start.</p>`;
      sidebar.appendChild(empty);
    } else {
      comments.forEach((c, i) => {
        const item = document.createElement('div');
        item.className = `ps-sidebar-item${c.version !== version ? ' ps-outdated' : ''}`;
        item.style.animationDelay = `${i * 50}ms`;
        item.innerHTML = `
          <div class="ps-sidebar-item-header">
            <span class="ps-comment-author-dot" style="background:${c.color}"></span>
            <span style="font-size:12px;font-weight:600;color:#e0e0e0">${c.author}</span>
            ${c.version !== version ? '<span class="ps-outdated-badge">v' + c.version + '</span>' : ''}
          </div>
          <div class="ps-sidebar-item-body">${c.body}</div>
        `;
        item.addEventListener('click', () => scrollToPin(c.id));
        sidebar.appendChild(item);
      });
    }

    document.body.appendChild(sidebar);
  }

  function scrollToPin(commentId) {
    const pin = document.querySelector(`.ps-pin[data-comment-id="${commentId}"]`);
    if (pin) {
      pin.scrollIntoView({ behavior: 'smooth', block: 'center' });
      pin.style.transform = 'rotate(-45deg) scale(1.3)';
      setTimeout(() => { pin.style.transform = ''; }, 400);
    }
  }

  // ─── Pin placement ───
  function createPin(comment, index) {
    const pin = document.createElement('div');
    pin.className = 'ps-pin';
    pin.setAttribute('data-comment-id', comment.id);
    pin.setAttribute('data-viewer-ignore', 'true');
    pin.style.background = comment.color;
    pin.style.left = `${comment.x}%`;
    pin.style.top = `calc(${comment.y}% + 40px)`; // offset for topbar
    pin.style.animationDelay = `${index * 60}ms`;

    // Try to anchor to selector
    let anchored = false;
    if (comment.selector && comment.version === version) {
      try {
        const target = document.querySelector(comment.selector);
        if (target) {
          const rect = target.getBoundingClientRect();
          pin.style.left = `${rect.left + rect.width / 2}px`;
          pin.style.top = `${rect.top + window.scrollY}px`;
          anchored = true;
        }
      } catch { /* selector invalid, use XY */ }
    }

    if (comment.version !== version) {
      pin.classList.add('ps-outdated');
    } else {
      pin.classList.add('ps-active');
    }

    pin.innerHTML = `<span class="ps-pin-number">${index + 1}</span>`;

    pin.addEventListener('click', (e) => {
      e.stopPropagation();
      showCommentPopup(comment, pin);
    });

    document.body.appendChild(pin);
    return pin;
  }

  // ─── Ripple effect on pin drop ───
  function createRipple(x, y, color) {
    const ripple = document.createElement('div');
    ripple.className = 'ps-pin-ripple';
    ripple.style.borderColor = color;
    ripple.style.left = `${x - 14}px`;
    ripple.style.top = `${y - 14}px`;
    document.body.appendChild(ripple);
    setTimeout(() => ripple.remove(), 500);
  }

  // ─── Comment popup with replies ───
  function showCommentPopup(comment, pinEl) {
    closePopup();
    const popup = document.createElement('div');
    popup.className = 'ps-comment-popup';
    popup.setAttribute('data-viewer-ignore', 'true');

    const rect = pinEl.getBoundingClientRect();
    popup.style.left = `${rect.right + 8}px`;
    popup.style.top = `${rect.top + window.scrollY}px`;

    // Keep popup in viewport
    requestAnimationFrame(() => {
      const pr = popup.getBoundingClientRect();
      if (pr.right > window.innerWidth) {
        popup.style.left = `${rect.left - pr.width - 8}px`;
      }
      if (pr.bottom > window.innerHeight) {
        popup.style.top = `${window.scrollY + window.innerHeight - pr.height - 16}px`;
      }
    });

    const fmtTime = (d) => new Date(d).toLocaleString(undefined, {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    // Build replies HTML
    const replies = comment.replies || [];
    const repliesHtml = replies.map(r => `
      <div class="ps-reply">
        <div class="ps-reply-header">
          <span class="ps-comment-author-dot" style="background:${r.color}"></span>
          <span class="ps-comment-author-name">${r.author}</span>
          <span class="ps-comment-time">${fmtTime(r.createdAt)}</span>
        </div>
        <div class="ps-reply-body">${r.body}</div>
      </div>
    `).join('');

    const identity = getIdentity();

    popup.innerHTML = `
      <div class="ps-comment-popup-header">
        <span class="ps-comment-author-dot" style="background:${comment.color}"></span>
        <span class="ps-comment-author-name">${comment.author}</span>
        <span class="ps-comment-time">${fmtTime(comment.createdAt)}</span>
      </div>
      <div class="ps-comment-body">${comment.body}</div>
      ${replies.length ? `<div class="ps-replies">${repliesHtml}</div>` : ''}
      <div class="ps-reply-input-wrap">
        ${!identity ? '<input class="ps-comment-input" style="min-height:28px;font-size:12px;margin-bottom:6px" placeholder="Your name" data-reply-name>' : ''}
        <div class="ps-reply-row">
          <input class="ps-comment-input ps-reply-input" placeholder="Reply..." data-reply-body>
          <button class="ps-reply-send" data-reply-send>→</button>
        </div>
      </div>
    `;

    // Reply submit handler
    const sendBtn = popup.querySelector('[data-reply-send]');
    const bodyInput = popup.querySelector('[data-reply-body]');
    const nameInput = popup.querySelector('[data-reply-name]');

    const submitReply = async () => {
      const text = bodyInput.value.trim();
      if (!text) return;

      const authorName = nameInput ? nameInput.value.trim() : (identity?.name || '');
      const color = identity?.color || randomColor();
      if (authorName && !identity) setIdentity(authorName, color);
      else if (!identity) setIdentity('', color);

      sendBtn.textContent = '...';
      sendBtn.disabled = true;

      try {
        const res = await fetch(`${API}/reply`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slug,
            commentId: comment.id,
            body: text,
            author: authorName || undefined,
            color,
          }),
        });

        if (!res.ok) throw new Error('Failed');
        const reply = await res.json();

        // Add reply to local comment object
        if (!comment.replies) comment.replies = [];
        comment.replies.push(reply);

        // Re-render popup with new reply
        showCommentPopup(comment, pinEl);
      } catch {
        sendBtn.textContent = '!';
        setTimeout(() => { sendBtn.textContent = '→'; sendBtn.disabled = false; }, 1000);
      }
    };

    sendBtn.addEventListener('click', submitReply);
    bodyInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitReply(); }
    });

    document.body.appendChild(popup);
    activePopup = popup;
  }

  function closePopup() {
    if (activePopup) {
      activePopup.remove();
      activePopup = null;
    }
  }

  // ─── New comment flow ───
  function startNewComment(e) {
    closePopup();
    const x = (e.pageX / document.documentElement.scrollWidth) * 100;
    const y = ((e.pageY - 40) / (document.documentElement.scrollHeight - 40)) * 100;

    const identity = getIdentity();
    const color = identity?.color || randomColor();

    // Drop pin immediately with ripple
    createRipple(e.pageX, e.pageY, color);

    const tempId = `temp-${Date.now()}`;
    const tempComment = {
      id: tempId,
      version,
      selector: selectorFor(e.target),
      x, y,
      body: '',
      author: identity?.name || '',
      color,
      createdAt: new Date().toISOString(),
    };

    const pin = createPin(tempComment, comments.length);
    pin.classList.remove('ps-active');

    // Show input popup
    const popup = document.createElement('div');
    popup.className = 'ps-comment-popup';
    popup.setAttribute('data-viewer-ignore', 'true');

    const rect = pin.getBoundingClientRect();
    popup.style.left = `${rect.right + 8}px`;
    popup.style.top = `${rect.top + window.scrollY}px`;

    popup.innerHTML = `
      <div class="ps-comment-input-wrap">
        ${!identity ? '<input class="ps-comment-input" style="min-height:32px;margin-bottom:8px" placeholder="Your name (optional)" data-name-input>' : ''}
        <textarea class="ps-comment-input" placeholder="Leave a comment..." autofocus data-body-input></textarea>
        <button class="ps-comment-submit" data-submit>Post comment</button>
      </div>
    `;

    document.body.appendChild(popup);
    activePopup = popup;

    const bodyInput = popup.querySelector('[data-body-input]');
    const nameInput = popup.querySelector('[data-name-input]');
    bodyInput.focus();

    popup.querySelector('[data-submit]').addEventListener('click', async () => {
      const body = bodyInput.value.trim();
      if (!body) return;

      const authorName = nameInput ? nameInput.value.trim() : (identity?.name || '');
      if (authorName && !identity) {
        setIdentity(authorName, color);
      } else if (!identity) {
        setIdentity('', color);
      }

      // Submit
      popup.querySelector('[data-submit]').textContent = 'Posting...';
      popup.querySelector('[data-submit]').disabled = true;

      try {
        const res = await fetch(`${API}/comments?slug=${slug}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slug,
            version,
            selector: tempComment.selector,
            x: tempComment.x,
            y: tempComment.y,
            body,
            author: authorName || undefined,
            color,
          }),
        });

        if (!res.ok) throw new Error('Failed to post');

        const saved = await res.json();
        comments.push(saved);

        // Remove temp pin, create real one
        pin.remove();
        createPin(saved, comments.length - 1);
        updateCommentCount(comments.length);

        // First comment shimmer
        if (comments.length === 1) {
          document.querySelector('.ps-topbar')?.classList.add('ps-shimmer');
          setTimeout(() => document.querySelector('.ps-topbar')?.classList.remove('ps-shimmer'), 1200);
        }

        closePopup();
      } catch (err) {
        // Queue in localStorage
        const queue = JSON.parse(localStorage.getItem('ps-pending-comments') || '[]');
        queue.push({ ...tempComment, body, author: authorName });
        localStorage.setItem('ps-pending-comments', JSON.stringify(queue));

        pin.style.opacity = '0.5';
        pin.style.border = '2px dashed #666';
        closePopup();
      }
    });

    // Submit on Cmd/Ctrl+Enter
    bodyInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        popup.querySelector('[data-submit]').click();
      }
    });
  }

  function randomColor() {
    const colors = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444', '#14b8a6'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  // ─── Click handler: Shift+click = comment, normal click = prototype interaction ───
  document.addEventListener('click', (e) => {
    // Ignore clicks on viewer chrome
    if (e.target.closest('[data-viewer-ignore]')) return;

    // Close popup on non-pin click
    if (activePopup && !e.target.closest('.ps-comment-popup') && !e.target.closest('.ps-pin')) {
      closePopup();
    }

    // Shift+click = new comment
    if (e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      startNewComment(e);
    }
  }, true);

  // ─── Load comments ───
  async function loadComments() {
    try {
      const res = await fetch(`${API}/comments?slug=${slug}`);
      if (!res.ok) return;
      comments = await res.json();

      // Render pins
      comments.forEach((c, i) => createPin(c, i));
      updateCommentCount(comments.length);
    } catch {
      // Comments unavailable, that's fine
    }
  }

  // ─── Retry pending comments ───
  async function retryPending() {
    const queue = JSON.parse(localStorage.getItem('ps-pending-comments') || '[]');
    if (!queue.length) return;

    const remaining = [];
    for (const c of queue) {
      try {
        const res = await fetch(`${API}/comments?slug=${slug}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(c),
        });
        if (!res.ok) { remaining.push(c); continue; }
        const saved = await res.json();
        comments.push(saved);
      } catch {
        remaining.push(c);
      }
    }
    localStorage.setItem('ps-pending-comments', JSON.stringify(remaining));
    if (remaining.length < queue.length) {
      updateCommentCount(comments.length);
    }
  }

  // ─── Init ───
  function init() {
    createTopBar();
    loadComments();
    retryPending();

    // Poll for new comments every 15s
    setInterval(async () => {
      try {
        const res = await fetch(`${API}/comments?slug=${slug}&version=${version}`);
        if (!res.ok) return;
        const fresh = await res.json();
        if (fresh.length > comments.length) {
          // New comments arrived
          const newOnes = fresh.slice(comments.length);
          comments = fresh;
          newOnes.forEach((c, i) => createPin(c, comments.length - newOnes.length + i));
          updateCommentCount(comments.length);
        }
      } catch { /* polling failure is fine */ }
    }, 15000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
