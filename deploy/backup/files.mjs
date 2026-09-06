// Small filesystem/JSON helper for the shell commands. No database state or lifecycle authority.
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { chmod, copyFile, lstat, mkdir, open, readFile, readdir, realpath, rename, rm, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const bin = dirname(fileURLToPath(import.meta.url));
const environment = process.env.BACKUP_ENVIRONMENT;
const root = process.env.BACKUP_ROOT;
const [action, directory, kind] = process.argv.slice(2);
const fixed = ['database.dump'];
const weeklyFixed = ['objects.jsonl', 'config/deployment.json', 'config/compose.yaml', 'config/nginx.conf', 'config/production.crontab', 'config/staging.crontab'];
const fail = () => { throw new Error('invalid-backup'); };
const json = async (path) => JSON.parse(await readFile(path, 'utf8'));
const safe = (path) => typeof path === 'string' && /^[a-zA-Z0-9_./-]+$/.test(path) && !isAbsolute(path) && path.split('/').every(part => part && part !== '.' && part !== '..');
async function canonical(path) {
  if (!isAbsolute(path) || path !== resolve(path)) fail();
  let cursor = path;
  while (true) {
    try { if (await realpath(cursor) !== cursor) fail(); break; }
    catch (error) { if (error.code !== 'ENOENT') throw error; cursor = dirname(cursor); }
  }
}
async function hash(path) {
  const digest = createHash('sha256');
  for await (const bytes of createReadStream(path)) digest.update(bytes);
  return digest.digest('hex');
}
async function durable(path) {
  const handle = await open(path, 'r');
  try { await handle.sync(); } finally { await handle.close(); }
}
async function write(path, value) {
  await writeFile(path, value, { mode: 0o600, flag: 'wx' });
  await durable(path);
}
async function inventory(path) {
  const text = await readFile(join(path, 'objects.jsonl'), 'utf8');
  const rows = text.trim() ? text.trim().split('\n').map(line => JSON.parse(line)) : [];
  const seen = new Set();
  for (const row of rows) {
    if (!['public', 'private'].includes(row.partition) || !safe(row.key) || !Number.isSafeInteger(row.size) || row.size < 0 || !/^[a-f0-9]{64}$/.test(row.sha256)) fail();
    const key = `${row.partition}/${row.key}`;
    if (seen.has(key)) fail();
    seen.add(key);
  }
  return rows;
}
async function regular(path) {
  await canonical(path);
  const info = await lstat(path);
  if (!info.isFile() || info.nlink !== 1) fail();
  return info;
}
async function walk(path, prefix = '') {
  const result = [];
  for (const name of (await readdir(path)).sort()) {
    const relative = prefix ? `${prefix}/${name}` : name;
    if (!safe(relative)) fail();
    const entry = join(path, name);
    const info = await lstat(entry);
    if (info.isDirectory()) result.push(...await walk(entry, relative));
    else { await regular(entry); result.push(relative); }
  }
  return result.sort();
}
async function payload(path, type) {
  if (type !== 'weekly') return fixed;
  return [...fixed, ...weeklyFixed, ...(await inventory(path)).map(row => `media/${row.partition}/${row.key}`)].sort();
}
async function verify(path, listing) {
  await canonical(path);
  const set = await json(join(path, 'set.json'));
  const complete = await json(join(path, 'complete.json'));
  if (set.schemaVersion !== 1 || !['daily', 'pre-deploy', 'weekly'].includes(set.kind) || !['production', 'staging', 'synthetic'].includes(set.environment) || (environment && set.environment !== environment)) fail();
  if (complete.schemaVersion !== 1 || complete.status !== 'complete' || complete.environment !== set.environment || complete.kind !== set.kind || !Number.isFinite(Date.parse(complete.completedAt))) fail();
  const expected = (await payload(path, set.kind)).sort();
  if (!Array.isArray(set.files) || JSON.stringify(set.files.map(file => file.path).sort()) !== JSON.stringify(expected)) fail();
  const actual = listing ? listing.map(file => file.path).sort() : await walk(path);
  if (JSON.stringify(actual) !== JSON.stringify([...expected, 'set.json', 'SHA256SUMS', 'complete.json'].sort())) fail();
  if (JSON.stringify(set.permissions) !== JSON.stringify({ uid: 10001, gid: 10001, directoryMode: '0700', fileMode: '0600', public: 'media/public', private: 'media/private' })) fail();
  for (const file of set.files) {
    if (!safe(file.path) || !/^[a-f0-9]{64}$/.test(file.sha256) || !Number.isSafeInteger(file.size) || file.size < 0) fail();
    if (listing) {
      if (listing.find(item => item.path === file.path)?.size !== file.size) fail();
      if (file.path === 'objects.jsonl' && await hash(join(path, file.path)) !== file.sha256) fail();
    } else if ((await regular(join(path, file.path))).size !== file.size || await hash(join(path, file.path)) !== file.sha256) fail();
  }
  if (set.kind === 'weekly') {
    for (const row of await inventory(path)) {
      const file = set.files.find(file => file.path === `media/${row.partition}/${row.key}`);
      if (file?.size !== row.size || file?.sha256 !== row.sha256) fail();
    }
  }
  const sums = [...set.files.map(file => `${file.sha256}  ${file.path}`), `${await hash(join(path, 'set.json'))}  set.json`, `${await hash(join(path, 'complete.json'))}  complete.json`].join('\n') + '\n';
  if (await readFile(join(path, 'SHA256SUMS'), 'utf8') !== sums) fail();
  return set;
}
function verifyWithTools(path) {
  execFileSync(join(bin, 'verify-backup-set'), [path], { stdio: 'ignore' });
}
try {
  if (action === 'roots') {
    await canonical(root);
    if (environment === 'synthetic' && (root === '/srv/cwt' || root.startsWith('/srv/cwt/'))) fail();
    const roots = [root, process.env.BACKUP_WORK_ROOT, process.env.PUBLIC_STORAGE_ROOT, process.env.PRIVATE_STORAGE_ROOT].filter(Boolean);
    for (const path of roots) await canonical(path);
    for (const a of roots) for (const b of roots) if (a !== b && a.startsWith(`${b}/`)) fail();
    if (new Set(roots).size !== roots.length) fail();
  } else if (action === 'copy-objects') {
    for (const row of await inventory(directory)) {
      const sourceRoot = row.partition === 'public' ? process.env.PUBLIC_STORAGE_ROOT : process.env.PRIVATE_STORAGE_ROOT;
      await canonical(sourceRoot);
      const source = join(sourceRoot, row.key);
      await regular(source);
      const target = join(directory, 'media', row.partition, row.key);
      await mkdir(dirname(target), { recursive: true, mode: 0o700 });
      await copyFile(source, target, 1);
      await chmod(target, 0o600);
      if ((await regular(target)).size !== row.size || await hash(target) !== row.sha256) fail();
    }
  } else if (action === 'configuration') {
    await mkdir(join(directory, 'config'), { mode: 0o700 });
    // Only shipped non-secret files; runtime.env and /run/secrets are NEVER copied.
    const project = resolve(bin, '../..');
    const files = { 'compose.yaml': 'compose.yaml', 'nginx.conf': 'deploy/proxy/nginx.conf', 'production.crontab': 'deploy/schedule/production.crontab', 'staging.crontab': 'deploy/schedule/staging.crontab' };
    for (const [target, source] of Object.entries(files)) {
      await write(join(directory, 'config', target), await readFile(join(project, source)));
    }
    const release = process.env.CWT_RELEASE_ID ?? '';
    if (release && !/^[a-f0-9]{40}$/.test(release)) fail();
    await write(join(directory, 'config/deployment.json'), JSON.stringify({ schemaVersion: 1, environment, release, storageDriver: 'local', publicRoot: process.env.PUBLIC_STORAGE_ROOT, privateRoot: process.env.PRIVATE_STORAGE_ROOT, secrets: 'Provision fresh credentials outside the backup before activation.' }) + '\n');
  } else if (action === 'seal') {
    const files = [];
    for (const path of (await payload(directory, kind)).sort()) {
      const absolute = join(directory, path);
      const info = await regular(absolute);
      await durable(absolute);
      files.push({ path, size: info.size, sha256: await hash(absolute) });
    }
    await write(join(directory, 'set.json'), JSON.stringify({ schemaVersion: 1, environment, kind, permissions: { uid: 10001, gid: 10001, directoryMode: '0700', fileMode: '0600', public: 'media/public', private: 'media/private' }, files }) + '\n');
    await write(join(directory, 'complete.json'), JSON.stringify({ schemaVersion: 1, environment, kind, status: 'complete', completedAt: new Date().toISOString() }) + '\n');
    const sums = [...files.map(file => `${file.sha256}  ${file.path}`), `${await hash(join(directory, 'set.json'))}  set.json`, `${await hash(join(directory, 'complete.json'))}  complete.json`].join('\n') + '\n';
    await write(join(directory, 'SHA256SUMS'), sums);
    // Persist directory entries too, from leaves to root.
    async function syncTree(path) { for (const name of await readdir(path)) if ((await lstat(join(path, name))).isDirectory()) await syncTree(join(path, name)); await durable(path); }
    await syncTree(directory);
  } else if (action === 'verify') {
    await verify(directory);
  } else if (action === 'verify-metadata') {
    await verify(directory, await json(kind));
  } else if (action === 'durable') {
    await durable(directory);
  } else if (action === 'health') {
    await verify(directory);
    const complete = await json(join(directory, 'complete.json'));
    if (complete.kind !== 'daily') fail();
    const temporary = join(root, `.health-${process.pid}.json`);
    await write(temporary, JSON.stringify({ schemaVersion: 1, environment, kind: 'daily_database', status: 'complete', completedAt: complete.completedAt }) + '\n');
    await rename(temporary, join(root, 'latest-complete.json'));
    await durable(root);
  } else if (action === 'retain-daily') {
    const dailyRoot = join(root, 'daily');
    const valid = [];
    for (const name of (await readdir(dailyRoot)).sort().reverse()) {
      if (!/^\d{8}T\d{6}-[a-zA-Z0-9]+$/.test(name)) continue;
      const path = join(dailyRoot, name);
      try {
        verifyWithTools(path);
        const completedAt = (await json(join(path, 'complete.json'))).completedAt;
        valid.push({ path, completedAt, time: Date.parse(completedAt) });
      } catch { process.stderr.write('Backup retention: invalid slot preserved; investigate.\n'); }
    }
    valid.sort((a, b) => b.time - a.time || b.path.localeCompare(a.path));

    const protectedPaths = new Set();
    if (directory) {
      await canonical(directory);
      if (dirname(directory) !== dailyRoot || !/^\d{8}T\d{6}-[a-zA-Z0-9]+$/.test(directory.slice(dailyRoot.length + 1))) fail();
      if (!valid.some(item => item.path === directory)) fail();
      protectedPaths.add(directory);
    }

    let health;
    try { health = await json(join(root, 'latest-complete.json')); }
    catch (error) { if (error.code !== 'ENOENT' || !directory) throw error; }
    if (health) {
      if (health.schemaVersion !== 1 || health.environment !== environment || health.kind !== 'daily_database' || health.status !== 'complete' || !Number.isFinite(Date.parse(health.completedAt))) fail();
      const corresponding = valid.find(item => item.completedAt === health.completedAt);
      if (corresponding) protectedPaths.add(corresponding.path);
      else if (!directory) fail();
    }
    if (!directory && protectedPaths.size !== 1) fail();

    const retained = new Set([...protectedPaths]);
    for (const { path } of valid) if (retained.size < 7) retained.add(path);
    for (const { path } of valid) if (!retained.has(path)) await rm(path, { recursive: true });
    for (const path of protectedPaths) verifyWithTools(path);
    await durable(dailyRoot);
  } else {
    fail();
  }
} catch {
  // Do not emit paths, SQL output, object IDs, customer names or credential errors.
  process.stderr.write(`Backup filesystem step failed: ${['roots', 'copy-objects', 'configuration', 'seal', 'verify', 'durable', 'health', 'retain-daily', 'verify-metadata'].includes(action) ? action : 'unknown'}.\n`);
  process.exitCode = 1;
}
