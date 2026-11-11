// Keeps the committed copy of the gateway's OpenAPI description in step with a pinned gateway commit.
//
//   node scripts/spec.mjs fetch [ref]   download openapi.json from crowpond/gateway at <ref> (default: the pinned
//                                       commit; use `main` or a commit to move the pin), then record commit and sha256
//   node scripts/spec.mjs check         verify that the committed copy still matches the recorded sha256 (offline)
//
// The pin lives in openapi/spec.lock.json. The gateway repository is private for now, so a download needs a token
// that can read it: GITHUB_TOKEN or GH_TOKEN, else `gh auth token`. Without any token the public raw URL is tried.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const REPO = 'crowpond/gateway';
const FILE = new URL('../openapi/gateway.json', import.meta.url);
const LOCK = new URL('../openapi/spec.lock.json', import.meta.url);

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');
const lock = () => JSON.parse(readFileSync(LOCK, 'utf8'));

function token() {
  const env = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (env) return env;
  try {
    return execFileSync('gh', ['auth', 'token'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}

async function get(url, headers = {}) {
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`${url}: ${res.status} ${res.statusText}`);
  return res;
}

async function fetchSpec(ref) {
  const t = token();
  const h = t ? { Authorization: `Bearer ${t}`, 'X-GitHub-Api-Version': '2022-11-28' } : {};
  // Resolve the ref to a full commit hash, so the pin is always immutable.
  let commit = ref;
  let body;
  if (t) {
    commit = (await (await get(`https://api.github.com/repos/${REPO}/commits/${encodeURIComponent(ref)}`, { ...h, Accept: 'application/vnd.github+json' })).json()).sha;
    body = Buffer.from(await (await get(`https://api.github.com/repos/${REPO}/contents/openapi.json?ref=${commit}`, { ...h, Accept: 'application/vnd.github.raw+json' })).arrayBuffer());
  } else {
    if (!/^[0-9a-f]{40}$/.test(ref)) throw new Error('without a token the ref must be a full commit hash');
    body = Buffer.from(await (await get(`https://raw.githubusercontent.com/${REPO}/${ref}/openapi.json`)).arrayBuffer());
  }
  JSON.parse(body.toString('utf8')); // must at least be JSON
  writeFileSync(FILE, body);
  writeFileSync(LOCK, JSON.stringify({ repository: REPO, path: 'openapi.json', commit, sha256: sha256(body) }, null, 2) + '\n');
  console.log(`openapi/gateway.json: ${REPO}@${commit} (${sha256(body).slice(0, 12)}...)`);
}

const [cmd, ref] = process.argv.slice(2);
if (cmd === 'fetch') {
  await fetchSpec(ref || lock().commit);
} else if (cmd === 'check') {
  const want = lock();
  const have = sha256(readFileSync(FILE));
  if (have !== want.sha256) {
    console.error(`openapi/gateway.json does not match openapi/spec.lock.json (${want.repository}@${want.commit}).\nDo not edit it by hand: run \`npm run fetch-spec\` (add a ref to move the pin).`);
    process.exit(1);
  }
  console.log(`openapi/gateway.json matches ${want.repository}@${want.commit.slice(0, 12)}`);
} else {
  console.error('usage: node scripts/spec.mjs fetch [ref] | check');
  process.exit(2);
}
