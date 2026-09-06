// Standard Restic snapshot/metadata operations; no separate admission ledger.
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const bin = dirname(fileURLToPath(import.meta.url));
const env = process.env.BACKUP_ENVIRONMENT;
const root = process.env.BACKUP_ROOT;
const work = process.env.BACKUP_WORK_ROOT;
const [action, slot] = process.argv.slice(2);
const run = args => execFileSync(join(bin, 'restic-run'), args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
const idValid = id => /^[a-f0-9]{64}$/.test(id ?? '');
const parseLines = text => text.trim().split('\n').filter(Boolean).map(line => JSON.parse(line));
function location(snapshot) {
  if (!idValid(snapshot.id) || snapshot.hostname !== `cwt-${env}` || !snapshot.tags?.includes(`cwt-weekly-${env}`) || snapshot.paths?.length !== 1 || ![join(work, '.weekly-work'), join(root, '.weekly-work')].includes(snapshot.paths[0]) || !Number.isFinite(Date.parse(snapshot.time))) throw new Error();
  return snapshot.paths[0];
}
const scratch = join(work, '.verify-weekly');
async function verifyFull(snapshot) {
  const source = location(snapshot);
  const target = join(scratch, 'new');
  try {
    run(['restore', snapshot.id, '--target', target, '--verify', '--quiet']);
    execFileSync(join(bin, 'verify-backup-set'), [join(target, source.slice(1))], { stdio: 'ignore' });
  } finally { await rm(target, { recursive: true, force: true }); }
}
async function verifyMetadata(snapshot) {
  const source = location(snapshot);
  const target = join(scratch, 'metadata');
  await mkdir(target, { mode: 0o700 });
  try {
    const listing = [];
    for (const node of parseLines(run(['ls', '--json', snapshot.id]))) {
      if (node.struct_type === 'snapshot') continue;
      if (node.type === 'dir') continue;
      if (node.type !== 'file' || !node.path.startsWith(`${source}/`) || !Number.isSafeInteger(node.size)) throw new Error();
      listing.push({ path: node.path.slice(source.length + 1), size: node.size });
    }
    for (const name of ['set.json', 'complete.json', 'SHA256SUMS', 'objects.jsonl']) {
      await writeFile(join(target, name), run(['dump', snapshot.id, `${source}/${name}`]), { mode: 0o600, flag: 'wx' });
    }
    const metadata = JSON.parse(await readFile(join(target, 'set.json'), 'utf8'));
    if (metadata.kind !== 'weekly') throw new Error();
    await writeFile(join(target, 'listing.json'), JSON.stringify(listing), { mode: 0o600 });
    execFileSync('node', [join(bin, 'files.mjs'), 'verify-metadata', target, join(target, 'listing.json')], { stdio: 'ignore' });
  } finally { await rm(target, { recursive: true }); }
}
let admitted = false;
let ownsScratch = false;
try {
  await mkdir(scratch, { mode: 0o700 });
  ownsScratch = true;
  let newId;
  if (action === 'backup') {
    if (slot !== join(work, '.weekly-work')) throw new Error();
    const summary = parseLines(run(['backup', '--json', '--host', `cwt-${env}`, '--tag', `cwt-weekly-${env}`, slot])).filter(item => item.message_type === 'summary');
    if (summary.length !== 1 || !idValid(summary[0].snapshot_id)) throw new Error();
    newId = summary[0].snapshot_id;
  } else if (action !== 'retain') throw new Error();
  const snapshots = JSON.parse(run(['snapshots', '--json', '--host', `cwt-${env}`, '--tag', `cwt-weekly-${env}`]));
  snapshots.sort((a, b) => Date.parse(b.time) - Date.parse(a.time));
  const newest = newId ? snapshots.find(item => item.id === newId) : snapshots[0];
  if (!newest) throw new Error();
  await verifyFull(newest);
  admitted = true;
  process.stdout.write(`Weekly recovery set verified (${env === 'synthetic' ? 'local Synthetic' : 'configured COS repository'}).\n`);
  // A failure from here is repository/retention maintenance, not failed admission.
  run(['check', '--read-data']);
  const valid = [];
  for (const snapshot of snapshots) {
    try { await verifyMetadata(snapshot); valid.push(snapshot); }
    catch { process.stderr.write('Weekly retention: invalid/unknown set preserved and excluded.\n'); }
  }
  if (!valid.some(item => item.id === newest.id)) throw new Error();
  // Always retain the newly verified set even if a bad source clock orders it last.
  const retained = new Set([newest.id, ...valid.filter(item => item.id !== newest.id).slice(0, 3).map(item => item.id)]);
  const excess = valid.filter(item => !retained.has(item.id));
  if (excess.length) {
    run(['forget', ...excess.map(item => item.id), '--quiet']);
    run(['prune', '--quiet']);
    run(['check']);
  }
} catch {
  process.stderr.write(admitted ? 'Weekly recovery set is verified; repository/retention maintenance failed.\n' : 'Weekly backup/verification failed; existing recovery sets preserved.\n');
  process.exitCode = admitted ? 2 : 1;
} finally {
  if (ownsScratch) await rm(scratch, { recursive: true, force: true });
}
