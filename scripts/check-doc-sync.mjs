#!/usr/bin/env node
// scripts/check-doc-sync.mjs — doc-sync drift guard (LOG D22, resolves #14).
//
// Read-only. Guards the seam between the human-authored *views* (ROADMAP / PROGRESS / INDEX)
// and the canonical state (GitHub issues + git + code). It does NOT rewrite anything — the
// ledgers stay hand-written synthesis; this just catches when they drift from reality.
//
//   npm run check:docs        # report; exits 1 on a HARD failure (for /retro + optional pre-push)
//
// HARD (exit 1): a research doc / ADR exists on disk but isn't referenced in its index.
// WARN (exit 0): an issue marked [x] DONE in the plan is still OPEN; the PROGRESS cursor is stale.

import { readFileSync, readdirSync } from 'node:fs';
import { execSync } from 'node:child_process';

const ROOT = new URL('..', import.meta.url).pathname;
const read = (p) => { try { return readFileSync(ROOT + p, 'utf8'); } catch { return ''; } };
const ls = (d) => { try { return readdirSync(ROOT + d); } catch { return []; } };

let hard = 0, warn = 0;
const fail = (m) => { hard++; console.log(`  ❌ ${m}`); };
const note = (m) => { warn++; console.log(`  ⚠️  ${m}`); };
const ok = (m) => console.log(`  ✅ ${m}`);

// 1) Every research doc is in the research INDEX (its stated purpose: stop re-doing research).
console.log('\n• Research docs → docs/research/INDEX.md');
{
  const index = read('docs/research/INDEX.md');
  const docs = ls('docs/research').filter((f) => f.endsWith('.md') && f !== 'INDEX.md');
  const missing = docs.filter((f) => !index.includes(f));
  missing.length
    ? missing.forEach((f) => fail(`research doc not indexed: docs/research/${f}`))
    : ok(`all ${docs.length} research docs indexed`);
}

// 2) Every ADR is referenced from the decision LOG (LOG is the ADR index).
console.log('\n• ADRs → docs/decisions/LOG.md');
{
  const log = read('docs/decisions/LOG.md');
  const adrs = ls('docs/adr').filter((f) => f.endsWith('.md'));
  const missing = adrs.filter((f) => !log.includes(f));
  missing.length
    ? missing.forEach((f) => fail(`ADR not linked from LOG: docs/adr/${f}`))
    : ok(`all ${adrs.length} ADRs linked from LOG`);
}

// 3) Issues on an [x] DONE line should be CLOSED (warn — an open epic can legitimately stay open).
console.log('\n• [x] DONE issues → GitHub state');
{
  const refs = new Set();
  for (const p of ['ROADMAP.md', 'docs/PROGRESS.md']) {
    let active = false; // inside a "- [x]" bullet, incl. its wrapped continuation lines
    for (const line of read(p).split('\n')) {
      if (/^\s*[-*]\s/.test(line)) active = /^\s*[-*]\s*\[x\]/.test(line); // a new list item sets state
      else if (line.trim() === '' || /^\s*#/.test(line)) active = false;   // blank / heading ends the bullet
      // "→ #N" is a see/deferred-to pointer (a follow-up), not a "this bullet is done" claim — drop it.
      if (active) for (const m of line.replace(/→\s*#\d+/g, '').matchAll(/#(\d+)/g)) refs.add(+m[1]);
    }
  }
  if (!refs.size) { ok('no [x]-marked issue refs found'); }
  else {
    let gh = true;
    const open = [];
    for (const n of [...refs].sort((a, b) => a - b)) {
      try {
        const s = JSON.parse(execSync(`gh issue view ${n} --json state`,
          { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })).state;
        if (s !== 'CLOSED') open.push(n);
      } catch { gh = false; break; }
    }
    if (!gh) note('gh unavailable — skipped the done-but-open check');
    else if (open.length) open.forEach((n) =>
      note(`#${n} is marked DONE in the plan but still OPEN — close it, or move it to [~] if it's an open epic`));
    else ok(`all ${refs.size} done-marked issues are closed`);
  }
}

// 4) PROGRESS cursor freshness (warn past a threshold — it's human-authored, so some lag is fine).
console.log('\n• PROGRESS.md freshness → HEAD');
{
  try {
    const last = execSync('git log -1 --format=%H -- docs/PROGRESS.md', { encoding: 'utf8' }).trim();
    const behind = +execSync(`git rev-list --count ${last}..HEAD`, { encoding: 'utf8' }).trim();
    behind > 8
      ? note(`PROGRESS.md is ${behind} commits behind HEAD — refresh the cursor`)
      : ok(`PROGRESS.md within ${behind} commit(s) of HEAD`);
  } catch { note('could not compute PROGRESS freshness (git?)'); }
}

console.log(`\n${hard ? '❌' : '✅'} doc-sync: ${hard} hard issue(s), ${warn} warning(s).\n`);
process.exit(hard ? 1 : 0);
