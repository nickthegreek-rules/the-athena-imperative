/**
 * Athena Imperative — App
 * Wires search module to UI. Handles rendering, copy-to-clipboard.
 */

// ── Language system ───────────────────────────────────────
const STRINGS = {
  en: {
    tagline:     'The most documented civilization in human history',
    placeholder: 'Search claims, evidence, rebuttals, sources…',
    ariaLabel:   'Search the evidence repository',
    try:         'Try',
    noResults:   'No evidence found for that query.',
    footer:      'Wisdom · Strategy · Shield · Spear · Courage · Stones don\'t lie. Coins don\'t lie. DNA doesn\'t lie.',
    sources:     'SOURCES',
    evidence:    'EVIDENCE ENTRIES',
    claims:      'CLAIMS',
    attacks:     'ATTACKS MAPPED',
    ourClaim:    'Our Claim',
    attack:      'Attack + Rebuttal',
    evidenceLbl: 'Evidence',
    sourceLbl:   'Source',
    attackLbl:   'ATTACK',
    rebuttalLbl: 'REBUTTAL',
    copy:        'Copy',
    copied:      'Copied',
    viewSource:  'View source ↗',
    results:     (n, q) => `${n} result${n !== 1 ? 's' : ''} · "${q}"`,
    statsDefault:(s,e,c,r) => `<span>${s}</span> sources · <span>${e}</span> evidence entries · <span>${c}</span> claims · <span>${r}</span> attacks mapped`,
  },
  el: {
    tagline:     'Ο πλέον τεκμηριωμένος πολιτισμός στην ανθρώπινη ιστορία',
    placeholder: 'Αναζήτηση θέσεων, αποδείξεων, ανασκευών, πηγών…',
    ariaLabel:   'Αναζήτηση στο αποθετήριο αποδείξεων',
    try:         'Δοκιμάστε',
    noResults:   'Δεν βρέθηκαν αποδείξεις για αυτήν την αναζήτηση.',
    footer:      'Σοφία · Στρατηγική · Ασπίδα · Δόρυ · Θάρρος · Οι πέτρες δεν λένε ψέματα. Τα νομίσματα δεν λένε ψέματα. Το DNA δεν λέει ψέματα.',
    sources:     'ΠΗΓΕΣ',
    evidence:    'ΑΠΟΔΕΙΞΕΙΣ',
    claims:      'ΘΕΣΕΙΣ',
    attacks:     'ΕΠΙΘΕΣΕΙΣ',
    ourClaim:    'Η Θέση μας',
    attack:      'Επίθεση + Ανασκευή',
    evidenceLbl: 'Απόδειξη',
    sourceLbl:   'Πηγή',
    attackLbl:   'ΕΠΙΘΕΣΗ',
    rebuttalLbl: 'ΑΝΑΣΚΕΥΗ',
    copy:        'Αντιγραφή',
    copied:      'Αντιγράφηκε',
    viewSource:  'Προβολή πηγής ↗',
    results:     (n, q) => `${n} αποτέλεσμα${n !== 1 ? 'τα' : ''} · "${q}"`,
    statsDefault:(s,e,c,r) => `<span>${s}</span> πηγές · <span>${e}</span> αποδείξεις · <span>${c}</span> θέσεις · <span>${r}</span> επιθέσεις`,
  }
};

let currentLang = 'en';

function setLang(lang) {
  currentLang = lang;
  const s = STRINGS[lang];

  // Toggle buttons
  document.getElementById('lang-en').classList.toggle('active', lang === 'en');
  document.getElementById('lang-el').classList.toggle('active', lang === 'el');

  // UI text
  document.getElementById('ui-tagline').textContent = s.tagline;
  document.getElementById('ui-try').textContent = s.try;
  document.getElementById('ui-footer').textContent = s.footer;

  const input = document.getElementById('search-input');
  input.placeholder = s.placeholder;
  input.setAttribute('aria-label', s.ariaLabel);

  const noRes = document.getElementById('no-results');
  if (noRes) noRes.textContent = s.noResults;

  // Re-render stats and results if any
  const q = input.value.trim();
  if (q) {
    const results = Search.query(q);
    if (results.length > 0) {
      renderResults(results, q);
      updateStatsBar(results.length, q);
    } else {
      updateStatsBar(0, q);
    }
  } else {
    updateStatsBar(null);
  }
}

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
          btn.textContent = STRINGS[currentLang].copied;
          btn.classList.add('copied');
          setTimeout(() => {
            btn.textContent = STRINGS[currentLang].copy;
            btn.classList.remove('copied');
          }, 1800);
        });
      });
    });
  }

  function renderCard(r, query) {
    const s = STRINGS[currentLang];
    const typeClass = `type-${r.type}`;

    // Type labels in current language
    const typeLabel = {
      claim: s.ourClaim,
      revisionist: s.attack,
      evidence: s.evidenceLbl,
      source: s.sourceLbl
    }[r.type] || r.typeLabel;

    // Build copy text
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
        <div class="result-attack-label">${s.attackLbl}</div>
        <div class="result-attack">${escHtml(r.raw.claim)}</div>
        <div class="result-rebuttal-label">${s.rebuttalLbl}</div>
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
      ? `<a class="result-link" href="${escHtml(r.url)}" target="_blank" rel="noopener">${s.viewSource}</a>`
      : '';

    return `
      <div class="result-card ${typeClass}" data-id="${r.id}">
        <div class="result-card-header">
          <span class="result-type">${escHtml(typeLabel)}</span>
          <span class="result-id">${r.id}</span>
        </div>
        ${inner}
        <div class="result-meta">${escHtml(r.meta)}</div>
        ${linkHtml}
        <br>
        <button class="copy-btn" data-copy="${escAttr(copyText)}">${s.copy}</button>
      </div>
    `;
  }

  // ── Stats bar ─────────────────────────────────────────────
  function updateStatsBar(count, query) {
    const s = STRINGS[currentLang];
    if (count === null) {
      statsBar.innerHTML = s.statsDefault(
        meta.counts.sources,
        meta.counts.evidence,
        meta.counts.claims,
        meta.counts.revisionist_claims
      );
    } else {
      statsBar.innerHTML = `<span>${count}</span> ${s.results(count, escHtml(query))}`;
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
