// Checks that every internal link and in-page anchor in dist/ resolves. Run after `npm run build`.
import fs from 'node:fs';
import path from 'node:path';

const dist = path.resolve('dist');
const base = '/docs';
const files = [];
(function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); e.isDirectory() ? walk(p) : p.endsWith('.html') && files.push(p); } })(dist);

const ids = new Map();
const html = new Map();
for (const f of files) {
  const t = fs.readFileSync(f, 'utf8');
  html.set(f, t);
  ids.set(f, new Set([...t.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])));
}
const bad = [];
for (const [f, t] of html) {
  for (const m of t.matchAll(/\shref="([^"]+)"/g)) {
    let h = m[1];
    if (/^(https?:|mailto:|tel:|data:)/.test(h)) continue;
    const [pathPart, hash] = h.split('#');
    let target = f;
    if (pathPart) {
      let p = pathPart.startsWith('/') ? pathPart : path.posix.join('/' + path.relative(dist, path.dirname(f)).split(path.sep).join('/'), pathPart);
      if (!p.startsWith(base)) { bad.push(`${path.relative(dist, f)}: outside base ${h}`); continue; }
      p = p.slice(base.length);
      const cand = [path.join(dist, p), path.join(dist, p, 'index.html')];
      target = cand.find((c) => fs.existsSync(c) && fs.statSync(c).isFile());
      if (!target) { bad.push(`${path.relative(dist, f)}: missing ${h}`); continue; }
    }
    if (hash && target.endsWith('.html') && ids.has(target) && !ids.get(target).has(decodeURIComponent(hash))) bad.push(`${path.relative(dist, f)}: missing anchor ${h}`);
  }
}
if (bad.length) { console.error([...new Set(bad)].join('\n')); process.exit(1); }
console.log(`checked ${files.length} pages, all internal links resolve`);
