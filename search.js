/**
 * Athena Imperative — Search Module
 * Queries all five data tables, scores by relevance, returns ranked results.
 */

const Search = (() => {

  let db = null;

  async function init(databaseUrl = 'database.json') {
    const res = await fetch(databaseUrl);
    db = await res.json();
    return db.meta;
  }

  function tokenize(str) {
    return str.toLowerCase()
      .replace(/["""''—–]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 2);
  }

  function score(tokens, ...fields) {
    const text = fields.join(' ').toLowerCase();
    let s = 0;
    for (const t of tokens) {
      if (text.includes(t)) s += 1;
      // Exact word boundary bonus
      const re = new RegExp(`\\b${t}\\b`);
      if (re.test(text)) s += 1;
    }
    return s;
  }

  function query(raw) {
    if (!db) throw new Error('Database not loaded. Call Search.init() first.');
    if (!raw || raw.trim().length < 2) return [];

    const tokens = tokenize(raw);
    const results = [];

    // 1. Claims — our positive assertions
    for (const c of db.claims) {
      const s = score(tokens, c.claim, c.category, c.rebuttal, c.notes, c.evidence);
      if (s > 0) results.push({
        type: 'claim',
        typeLabel: 'Our Claim',
        id: c.id,
        title: c.claim,
        body: c.rebuttal,
        meta: `${c.category} · ${c.strength} · ${c.status}`,
        score: s * 3, // Weight claims highest — these are our positions
        raw: c
      });
    }

    // 2. Revisionist Claims — attacks + rebuttals
    for (const r of db.revisionist_claims) {
      const s = score(tokens, r.claim, r.label, r.rebuttal, r.origin);
      if (s > 0) results.push({
        type: 'revisionist',
        typeLabel: 'Attack + Rebuttal',
        id: r.id,
        title: r.label || r.claim.slice(0, 80),
        attack: r.claim,
        body: r.rebuttal,
        meta: `Origin: ${r.origin} · Danger: ${r.danger} · ${r.frequency}`,
        score: s * 2.5,
        raw: r
      });
    }

    // 3. Evidence — the raw findings
    for (const e of db.evidence) {
      const s = score(tokens, e.summary, e.type, e.quote, e.notes, e.source);
      if (s > 0) results.push({
        type: 'evidence',
        typeLabel: 'Evidence',
        id: e.id,
        title: e.summary.slice(0, 120) + (e.summary.length > 120 ? '…' : ''),
        body: e.quote || e.notes,
        meta: `${e.type} · ${e.date} · Source: ${e.source}`,
        score: s * 2,
        raw: e
      });
    }

    // 4. Sources — bibliographic records
    for (const s of db.sources) {
      const sc = score(tokens, s.title, s.authors, s.notes, s.evidence_summary);
      if (sc > 0) results.push({
        type: 'source',
        typeLabel: 'Source',
        id: s.id,
        title: s.title,
        body: s.notes || s.evidence_summary,
        meta: `${s.authors} · ${s.year} · ${s.type} · Credibility: ${s.credibility}`,
        url: s.url,
        score: sc * 1.5,
        raw: s
      });
    }

    // Sort by score descending, cap at 20
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);
  }

  function getStats() {
    if (!db) return null;
    return db.meta;
  }

  return { init, query, getStats };
})();
