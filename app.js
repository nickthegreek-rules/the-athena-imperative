/**
 * Athena Imperative — App
 * Wires search module to UI. Handles rendering, copy-to-clipboard.
 */

(async () => {

  // ── Init ────────────────────────────────────────────────
  let meta;
  try {
    meta = await Search.init('database.json');
  } catch (e) {
    console.error('Failed to load database:', e);
    document.getElementById('stats-bar').textContent = 'Database unavailable.';
    return;
  }

  // ── Elements ─────────────────────────────────────────────
  const header      = document.getElementById('header');
  const input       = document.getElementById('search-input');
  const statsBar    = document.getElementById('stats-bar');
  const introHint   = document.getElementById('intro-hint');
  const resultsEl   = document.getElementById('results');
  const noResults   = document.getElementById('no-results');

  updateStatsBar(null);

  // ── Search handler ────────────────────────────────────────
  let debounceTimer;

  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => runSearch(input.value.trim()), 220);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      input.value = '';
      showIntro();
    }
  });

  function runSearch(q) {
    if (!q) { showIntro(); return; }

    header.classList.add('compact');
    introHint.style.display = 'none';
    noResults.style.display = 'none';

    const results = Search.query(q);

    if (results.length === 0) {
      resultsEl.innerHTML = '';
      noResults.style.display = 'block';
      updateStatsBar(0, q);
      return;
    }

    updateStatsBar(results.length, q);
    renderResults(results, q);
  }

  function showIntro() {
    header.classList.remove('compact');
    introHint.style.display = 'block';
    noResults.style.display = 'none';
    resultsEl.innerHTML = '';
    updateStatsBar(null);
  }

  // ── Render ────────────────────────────────────────────────
  function renderResults(results, query) {
    const html = results.map(r => renderCard(r, query)).join('');
    resultsEl.innerHTML = `
      <div id="results-meta">${results.length} result${results.length !== 1 ? 's' : ''} · "${escHtml(query)}"</div>
      ${html}
    `;

    // Bind copy buttons
    resultsEl.querySelectorAll('.copy-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const text = btn.dataset.copy;
        navigator.clipboard.writeText(text).then(() => {
          btn.textContent = 'Copied';
          btn.classList.add('copied');
          setTimeout(() => {
            btn.textContent = 'Copy';
            btn.classList.remove('copied');
          }, 1800);
        });
      });
    });
  }

  function renderCard(r, query) {
    const typeClass = `type-${r.type}`;

    // Build copy text — what a user would paste in a comment
    let copyText = '';

    if (r.type === 'claim') {
      copyText = r.title + (r.body ? '\n\n' + r.body : '');
    } else if (r.type === 'revisionist') {
      copyText = 'Claim: ' + r.raw.claim + '\n\nRebuttal: ' + r.body;
    } else if (r.type === 'evidence') {
      copyText = r.raw.summary + (r.raw.quote ? '\n\n"' + r.raw.quote + '"' : '') + (r.raw.source ? '\n\nSource: ' + r.raw.source : '');
    } else {
      copyText = r.title + (r.body ? '\n\n' + r.body : '') + (r.meta ? '\n\n' + r.meta : '');
    }

    // Type-specific inner HTML
    let inner = '';

    if (r.type === 'revisionist') {
      inner = `
        <div class="result-attack-label">Attack</div>
        <div class="result-attack">${escHtml(r.raw.claim)}</div>
        <div class="result-rebuttal-label">Rebuttal</div>
        <div class="result-body">${escHtml(r.body)}</div>
      `;
    } else if (r.type === 'evidence') {
      inner = `
        <div class="result-title">${escHtml(r.title)}</div>
        ${r.raw.quote ? `<div class="result-quote">${escHtml(r.raw.quote)}</div>` : ''}
        ${r.body && r.body !== r.raw.quote ? `<div class="result-body">${escHtml(r.body)}</div>` : ''}
      `;
    } else {
      inner = `
        <div class="result-title">${escHtml(r.title)}</div>
        ${r.body ? `<div class="result-body">${escHtml(r.body)}</div>` : ''}
      `;
    }

    const linkHtml = (r.url)
      ? `<a class="result-link" href="${escHtml(r.url)}" target="_blank" rel="noopener">View source ↗</a>`
      : '';

    return `
      <div class="result-card ${typeClass}" data-id="${r.id}">
        <div class="result-card-header">
          <span class="result-type">${escHtml(r.typeLabel)}</span>
          <span class="result-id">${r.id}</span>
        </div>
        ${inner}
        <div class="result-meta">${escHtml(r.meta)}</div>
        ${linkHtml}
        <br>
        <button class="copy-btn" data-copy="${escAttr(copyText)}">Copy</button>
      </div>
    `;
  }

  // ── Stats bar ─────────────────────────────────────────────
  function updateStatsBar(count, query) {
    if (count === null) {
      statsBar.innerHTML = `
        <span>${meta.counts.sources}</span> sources ·
        <span>${meta.counts.evidence}</span> evidence entries ·
        <span>${meta.counts.claims}</span> claims ·
        <span>${meta.counts.revisionist_claims}</span> attacks mapped
      `;
    } else {
      statsBar.innerHTML = `<span>${count}</span> result${count !== 1 ? 's' : ''} for "${escHtml(query)}"`;
    }
  }

  // ── Helpers ───────────────────────────────────────────────
  function escHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function escAttr(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

})();
