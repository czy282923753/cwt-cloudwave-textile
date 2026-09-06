import assert from 'node:assert/strict';
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

// Run only inside run-local-tests.sh's disposable network-none Linux lab.
const bin = '/app/deploy/backup';
const root = '/lab/backups';
const env = { ...process.env, APP_ENV: 'test', BACKUP_ENVIRONMENT: 'synthetic', BACKUP_ROOT: root, BACKUP_WORK_ROOT: `${root}-sets`, BACKUP_LOCK_FILE: '/lab/backup-migration.lock',
  PUBLIC_STORAGE_ROOT: '/lab/public', PRIVATE_STORAGE_ROOT: '/lab/private', IMPORT_STORAGE_ROOT: '/lab/import',
  PGHOST: '/socket', PGUSER: 'cwt_source', PGDATABASE: 'cwt_synthetic',
  DATABASE_DRIVER: 'postgres', DATABASE_URL: '',
  BACKUP_REPOSITORY_PASSWORD_FILE: '/lab/restic-password', RESTIC_PASSWORD_FILE: '/lab/restic-password', RESTIC_REPOSITORY: `${root}/restic`, RESTIC_CACHE_DIR: `${root}/.restic-cache`,
};
function run(program, args = [], changes = {}) {
  return execFileSync(program, args, { env: { ...env, ...changes }, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}
function command(name, args = [], changes = {}) { return run(join(bin, name), args, changes); }
function refuses(name, args = [], changes = {}) {
  const result = spawnSync(join(bin, name), args, { env: { ...env, ...changes }, encoding: 'utf8' });
  assert.notEqual(result.status, 0, `${name} should refuse`);
}
function sql(query, changes = {}) { return run('psql', ['-XAtq', '-v', 'ON_ERROR_STOP=1', '-c', query], changes); }
function snapshots() { return JSON.parse(run('restic', ['snapshots', '--json'])); }
let weekly;

test('real PostgreSQL 18 and Restic recovery invariants', async (t) => {
  assert.equal(process.platform, 'linux');
  for (const path of [root, '/lab/public', '/lab/private', '/lab/import']) mkdirSync(path, { recursive: true, mode: 0o700 });
  writeFileSync('/lab/backup-migration.lock', '', { mode: 0o444 });
  writeFileSync('/lab/restic-password', 'SYNTHETIC-ONLY-restic-password-not-a-real-secret', { mode: 0o600 });
  run('node', ['--conditions=react-server', '--import=tsx', '/app/scripts/migrate.ts']);
  run('node', ['--conditions=react-server', '--import=tsx', '/app/scripts/seed-fixtures.ts']);
  // An ordinary persisted Private Inquiry original, never a Public Asset.
  const bytes = Buffer.from('SYNTHETIC private customer file; no real customer data');
  writeFileSync('/lab/private/synthetic-inquiry.pdf', bytes);
  sql(`INSERT INTO assets (id, original_file_name, storage_provider, storage_partition, object_key, access, category, status, declared_mime_type, detected_mime_type, byte_size, sha256, scan_status) VALUES ('11111111-1111-4111-8111-111111111111','synthetic.pdf','local','private','synthetic-inquiry.pdf','private','inquiry','ready','application/pdf','application/pdf',${bytes.length},'${createHash('sha256').update(bytes).digest('hex')}','passed')`);
  sql(`INSERT INTO contacts (id,name,email,normalized_email) VALUES ('22222222-2222-4222-8222-222222222222','SYNTHETIC','synthetic@example.test','synthetic@example.test');
INSERT INTO inquiries (id,public_reference,contact_id,submitted_name,submitted_email,idempotency_key,source_page_path) VALUES ('33333333-3333-4333-8333-333333333333','SYNTHETIC-RESTORE','22222222-2222-4222-8222-222222222222','SYNTHETIC','synthetic@example.test','synthetic-backup-only','/');
INSERT INTO inquiry_assets (inquiry_id,asset_id) VALUES ('33333333-3333-4333-8333-333333333333','11111111-1111-4111-8111-111111111111')`);
  run('restic', ['init', '--quiet']);
  await t.test('valid custom dump, atomic completion and existing health contract', () => {
    const slot = command('backup-postgresql');
    assert.match(command('verify-backup-set', [slot]), /verified/);
    const marker = JSON.parse(readFileSync(`${root}/latest-complete.json`, 'utf8'));
    assert.deepEqual(Object.keys(marker).sort(), ['completedAt', 'environment', 'kind', 'schemaVersion', 'status']);
    assert.equal(marker.kind, 'daily_database');
    assert.equal(marker.status, 'complete');
    assert.equal(marker.environment, 'synthetic');
  });
  await t.test('missing completion, missing object, checksum corruption and truncated dump are rejected', () => {
    const slot = command('backup-postgresql');
    for (const mutation of ['complete.json', 'database.dump', 'corrupt', 'truncated']) {
      const target = `/lab/broken-${mutation}`;
      cpSync(slot, target, { recursive: true });
      if (mutation === 'corrupt') writeFileSync(`${target}/SHA256SUMS`, 'invalid\n');
      else if (mutation === 'truncated') writeFileSync(`${target}/database.dump`, readFileSync(`${target}/database.dump`).subarray(0, 60));
      else rmSync(`${target}/${mutation}`);
      refuses('verify-backup-set', [target]);
      rmSync(target, { recursive: true });
    }
    // Even with newly computed metadata, pg_restore must reject a truncated payload.
    const target = '/lab/truncated-resealed'; mkdirSync(target);
    writeFileSync(`${target}/database.dump`, readFileSync(`${slot}/database.dump`).subarray(0, 60));
    run('node', [`${bin}/files.mjs`, 'seal', target, 'daily']);
    refuses('verify-backup-set', [target]);
  });
  await t.test('failed extra backup blocks the change and leaves health unchanged', () => {
    const before = readFileSync(`${root}/latest-complete.json`, 'utf8');
    refuses('pre-deploy', ['touch', '/lab/must-not-run'], { PGDATABASE: 'missing_database' });
    assert.equal(readdirSync('/lab').includes('must-not-run'), false);
    assert.equal(readFileSync(`${root}/latest-complete.json`, 'utf8'), before);
    command('pre-deploy', ['touch', '/lab/deploy-ran']);
    assert.equal(readdirSync('/lab').includes('deploy-ran'), true);
  });
  await t.test('one shared mutex refuses both environment backups and Migration before database access', async () => {
    const holder = spawn('flock', [env.BACKUP_LOCK_FILE, 'sh', '-c', 'echo ready; cat'], { stdio: ['pipe', 'pipe', 'pipe'] });
    await new Promise((resolve, reject) => { holder.stdout.once('data', resolve); holder.once('error', reject); });
    try {
      for (const name of ['backup-postgresql', 'backup-weekly', 'pre-deploy', 'retain-backups']) {
        const result = spawnSync(join(bin, name), name === 'pre-deploy' ? ['true'] : name === 'retain-backups' ? ['daily', '--locked'] : [], { env: { ...env, PGHOST: '/missing-socket', BACKUP_ROOT: '/lab/other-environment' }, encoding: 'utf8' });
        assert.equal(result.status, 75, name);
      }
      const migration = spawnSync('node', ['--conditions=react-server', '--import=tsx', '/app/scripts/migrate.ts'], { env: { ...env, PGHOST: '/missing-socket' }, encoding: 'utf8' });
      assert.equal(migration.status, 75);
    } finally { holder.stdin.end(); await new Promise(resolve => holder.once('exit', resolve)); }
    assert.match(command('pre-deploy', ['node', '--conditions=react-server', '--import=tsx', '/app/scripts/migrate.ts']), /Database migrations applied/);
    const blocker = spawn('psql', ['-XAtq', '-v', 'ON_ERROR_STOP=1'], { env: { ...env, PGAPPNAME: 'cwt-migration-test-blocker' }, stdio: ['pipe', 'pipe', 'pipe'] });
    const ready = new Promise(resolve => blocker.stdout.once('data', resolve));
    blocker.stdin.write("BEGIN; LOCK drizzle.__drizzle_migrations IN ACCESS EXCLUSIVE MODE; SELECT 'ready';\n");
    await ready;
    const migration = spawn('node', ['--conditions=react-server', '--import=tsx', '/app/scripts/migrate.ts'], { env, stdio: ['ignore', 'pipe', 'pipe'] });
    migration.stdout.resume(); migration.stderr.resume();
    const finished = new Promise(resolve => migration.once('exit', resolve));
    try {
      let waiting = false;
      for (let attempt = 0; attempt < 50; attempt++) {
        waiting = Number(sql("SELECT count(*) FROM pg_stat_activity WHERE usename = 'cwt_source' AND wait_event_type = 'Lock'", { PGUSER: 'postgres' })) > 0;
        if (waiting) break;
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      assert.equal(waiting, true, 'direct Migration reached the database after its short flock child exited');
      const backup = spawnSync(join(bin, 'backup-postgresql'), [], { env: { ...env, PGHOST: '/missing-socket' } });
      assert.equal(backup.status, 75, 'Migration retains its OS mutex while working');
    } finally { blocker.stdin.end('COMMIT;\n'); }
    assert.equal(await finished, 0);

  });
  await t.test('seven valid daily slots survive a corrupt newest slot', () => {
    for (let index = 0; index < 8; index++) command('backup-postgresql');
    const valid = readdirSync(`${root}/daily`).filter(name => !name.startsWith('.'));
    assert.equal(valid.length, 7);
    const bad = `${root}/daily/99991231T235959-broken`;
    cpSync(join(root, 'daily', valid[0]), bad, { recursive: true });
    writeFileSync(`${bad}/database.dump`, 'broken');
    command('retain-backups', ['daily']);
    const remaining = readdirSync(`${root}/daily`);
    assert.equal(remaining.length, 8);
    for (const name of valid) command('verify-backup-set', [join(root, 'daily', name)]);
  });
  await t.test('clock correction cannot delete the admitted daily set or break health correspondence', () => {
    const clockRoot = '/lab/clock-backups';
    const clockEnv = { BACKUP_ROOT: clockRoot, BACKUP_WORK_ROOT: '/lab/clock-backup-sets' };
    writeFileSync('/lab/future-clock.mjs', `const ActualDate = Date; const future = ActualDate.parse('2099-01-01T00:00:00.000Z'); globalThis.Date = class extends ActualDate { constructor(...args) { super(...(args.length ? args : [future])); } static now() { return future; } };\n`);
    for (let index = 0; index < 7; index++) command('backup-postgresql', [], { ...clockEnv, NODE_OPTIONS: '--import=/lab/future-clock.mjs' });
    const admitted = command('backup-postgresql', [], clockEnv);
    assert.equal(readdirSync(`${clockRoot}/daily`).includes(admitted.slice(`${clockRoot}/daily/`.length)), true);
    const marker = JSON.parse(readFileSync(`${clockRoot}/latest-complete.json`, 'utf8'));
    assert.equal(JSON.parse(readFileSync(`${admitted}/complete.json`, 'utf8')).completedAt, marker.completedAt);
    const outside = '/lab/verified-but-outside-daily';
    cpSync(admitted, outside, { recursive: true });
    refuses('retain-backups', ['daily', outside], clockEnv);

    const corrupt = `${clockRoot}/daily/99991231T235959-corrupt`;
    cpSync(admitted, corrupt, { recursive: true });
    writeFileSync(`${corrupt}/database.dump`, 'corrupt');
    mkdirSync(`${clockRoot}/daily/unknown-format`);
    command('retain-backups', ['daily'], clockEnv);
    const remaining = readdirSync(`${clockRoot}/daily`);
    assert.equal(remaining.includes(admitted.slice(`${clockRoot}/daily/`.length)), true);
    assert.equal(remaining.includes('99991231T235959-corrupt'), true);
    assert.equal(remaining.includes('unknown-format'), true);
    assert.equal(remaining.filter(name => /^\d{8}T\d{6}-[a-zA-Z0-9]+$/.test(name) && name !== '99991231T235959-corrupt').length, 7);
    const corresponding = remaining.filter(name => name !== '99991231T235959-corrupt' && /^\d{8}T\d{6}-[a-zA-Z0-9]+$/.test(name)).some(name => {
      try { return JSON.parse(readFileSync(`${clockRoot}/daily/${name}/complete.json`, 'utf8')).completedAt === marker.completedAt; } catch { return false; }
    });
    assert.equal(corresponding, true);
    const beforeMissingCorrespondence = [...remaining].sort();
    writeFileSync(`${clockRoot}/latest-complete.json`, JSON.stringify({ ...marker, completedAt: '2000-01-01T00:00:00.000Z' }));
    refuses('retain-backups', ['daily'], clockEnv);
    assert.deepEqual(readdirSync(`${clockRoot}/daily`).sort(), beforeMissingCorrespondence);
  });
  await t.test('snapshot-coupled originals, exactly two database sessions and encrypted local read-back', async () => {
    const blocker = spawn('psql', ['-XAtq', '-v', 'ON_ERROR_STOP=1'], { env: { ...env, PGAPPNAME: 'cwt-test-blocker' }, stdio: ['pipe', 'pipe', 'pipe'] });
    const ready = new Promise((resolve, reject) => { blocker.stdout.once('data', resolve); blocker.once('error', reject); });
    blocker.stdin.write("BEGIN; LOCK organizations IN ACCESS EXCLUSIVE MODE; SELECT 'ready';\n");
    await ready;
    const task = spawn(join(bin, 'backup-weekly'), [], { env: { ...env, PGAPPNAME: 'cwt-weekly-observation' }, stdio: ['ignore', 'pipe', 'pipe'] });
    let diagnostics = '';
    task.stderr.on('data', bytes => { diagnostics += bytes; }); task.stdout.resume();
    const done = new Promise(resolve => task.once('exit', resolve));
    let observed = 0;
    try {
      for (let attempt = 0; attempt < 50; attempt++) {
        observed = Number(sql("SELECT count(*) FROM pg_stat_activity WHERE application_name = 'cwt-weekly-observation'", { PGUSER: 'postgres' }));
        assert.ok(observed <= 2, 'weekly backup may use at most two database sessions');
        if (observed === 2) break;
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      assert.equal(observed, 2, 'exporter and pg_dump remain simultaneously connected');
      const competing = spawnSync(join(bin, 'backup-postgresql'), [], { env: { ...env, BACKUP_ROOT: '/lab/other-environment', PGHOST: '/missing-socket' } });
      assert.equal(competing.status, 75);
    } finally { blocker.stdin.end('COMMIT;\n'); }
    assert.equal(await done, 0, diagnostics);
    assert.equal(snapshots().length, 1);
    const latest = snapshots()[0];
    run('restic', ['restore', latest.id, '--target', '/lab/export', '--verify', '--quiet']);
    weekly = '/lab/export/lab/backups-sets/.weekly-work';
    command('verify-backup-set', [weekly]);
    const set = JSON.parse(readFileSync(`${weekly}/set.json`, 'utf8'));
    assert.equal(set.kind, 'weekly');
    assert.ok(set.files.some(file => file.path === 'media/private/synthetic-inquiry.pdf'));
    assert.ok(set.files.some(file => file.path.startsWith('media/public/')));
    assert.equal(set.files.some(file => /password|secret|\.env|import\/|logs\//.test(file.path)), false);
    const variants = sql('SELECT object_key FROM asset_variants').split('\n').filter(Boolean);
    for (const key of variants) assert.equal(set.files.some(file => file.path === `media/public/${key}`), false);
  });
  await t.test('missing or changed source originals never create a weekly snapshot', () => {
    const original = readFileSync('/lab/private/synthetic-inquiry.pdf');
    rmSync('/lab/private/synthetic-inquiry.pdf');
    refuses('backup-weekly');
    assert.equal(snapshots().length, 1);
    writeFileSync('/lab/private/synthetic-inquiry.pdf', 'wrong bytes');
    refuses('backup-weekly');
    assert.equal(snapshots().length, 1);
    writeFileSync('/lab/private/synthetic-inquiry.pdf', original);
  });
  await t.test('four valid weekly snapshots; invalid partial upload cannot displace them', () => {
    mkdirSync('/lab/tool-observation', { mode: 0o700 });
    const realRestic = run('sh', ['-c', 'command -v restic']);
    assert.match(realRestic, /^\/[a-zA-Z0-9_/-]+$/);
    writeFileSync('/lab/tool-observation/restic', `#!/bin/sh\nprintf '%s %s\\n' "$1" "\${2:-}" >> /lab/restic-calls\nif test "\${CWT_SYNTHETIC_FAIL_CHECK:-}" = yes && test "$1" = check && test "\${2:-}" = --read-data; then exit 23; fi\nexec ${realRestic} "$@"\n`, { mode: 0o700 });
    const observedEnv = { PATH: `/lab/tool-observation:${env.PATH}` };
    for (let index = 0; index < 4; index++) {
      writeFileSync('/lab/restic-calls', '');
      command('backup-weekly', [], observedEnv);
      const calls = readFileSync('/lab/restic-calls', 'utf8').trim().split('\n');
      assert.equal(calls.filter(call => call.startsWith('restore ')).length, 1);
      assert.equal(calls.filter(call => call === 'check --read-data').length, 1);
    }
    assert.equal(snapshots().length, 4);
    cpSync(weekly, `${root}/.weekly-work`, { recursive: true });
    rmSync(`${root}/.weekly-work/complete.json`);
    run('restic', ['backup', '--quiet', '--host', 'cwt-synthetic', '--tag', 'cwt-weekly-synthetic', `${root}/.weekly-work`]);
    refuses('retain-backups', ['weekly']);
    assert.equal(snapshots().length, 5);
    rmSync(`${root}/.weekly-work`, { recursive: true });
    const before = snapshots().map(snapshot => snapshot.id);
    const maintenanceFailure = spawnSync(join(bin, 'backup-weekly'), [], { env: { ...env, ...observedEnv, CWT_SYNTHETIC_FAIL_CHECK: 'yes' }, encoding: 'utf8' });
    assert.equal(maintenanceFailure.status, 2);
    assert.match(maintenanceFailure.stdout, /Weekly recovery set verified/);
    assert.match(maintenanceFailure.stderr, /maintenance failed/);
    for (const id of before) assert.ok(snapshots().some(snapshot => snapshot.id === id));
    command('retain-backups', ['weekly']);
    assert.equal(snapshots().length, 5, 'four valid sets and preserved invalid set');
  });
  await t.test('real empty restore preserves schema/data/routes/revisions and private safety', () => {
    mkdirSync('/lab/restored');
    const result = command('restore-empty', [weekly, '/lab/restored'], { PGUSER: 'cwt_restore', PGDATABASE: 'cwt_restore_valid' });
    assert.match(result, /Synthetic restore verified/);
    assert.equal(sql('SELECT count(*) FROM products'), sql('SELECT count(*) FROM products', { PGUSER: 'cwt_restore', PGDATABASE: 'cwt_restore_valid' }));
    for (const table of ['routes', 'editorial_revisions', 'assets', 'audit_logs']) assert.equal(sql(`SELECT count(*) FROM ${table}`), sql(`SELECT count(*) FROM ${table}`, { PGUSER: 'cwt_restore', PGDATABASE: 'cwt_restore_valid' }));
    assert.deepEqual(readFileSync('/lab/restored/private/synthetic-inquiry.pdf'), readFileSync('/lab/private/synthetic-inquiry.pdf'));
    const safety = JSON.parse(readFileSync('/lab/restored/restore-safety.json', 'utf8'));
    assert.equal(safety.NON_PRODUCTION_NOINDEX, true);
    assert.equal(safety.ANALYTICS_DRIVER, 'disabled');
    assert.equal(safety.EMAIL_DRIVER, 'log');
    assert.equal(safety.INQUIRY_NOTIFICATION_TO, 'restore-sink@example.test');
    assert.equal(safety.FEATURE_AI, false);
  });
  await t.test('nonempty targets, production identity and non-socket connections refuse', () => {
    refuses('restore-empty', [weekly, '/lab/restored'], { PGUSER: 'cwt_restore', PGDATABASE: 'cwt_restore_valid' });
    mkdirSync('/lab/nonempty-db');
    refuses('restore-empty', [weekly, '/lab/nonempty-db'], { PGUSER: 'cwt_restore', PGDATABASE: 'cwt_restore_valid' });
    refuses('restore-empty', [weekly, '/lab/nonempty-db'], { PGDATABASE: 'production' });
    refuses('restore-empty', [weekly, '/lab/nonempty-db'], { PGHOST: 'postgres' });
    refuses('restore-empty', [weekly, '/lab/nonempty-db'], { PGUSER: '' });
    mkdirSync(`${weekly}/overlap`);
    refuses('restore-empty', [weekly, `${weekly}/overlap`], { PGUSER: 'cwt_restore', PGDATABASE: 'cwt_restore_valid' });
    rmSync(`${weekly}/overlap`, { recursive: true });
    command('verify-backup-set', [weekly]);
  });
});
