import { chmod, copyFile, lstat, mkdir, readdir, readFile, realpath, writeFile } from 'node:fs/promises';
import { networkInterfaces } from 'node:os';
import { dirname, isAbsolute, join, resolve } from 'node:path';
const [action, source, target] = process.argv.slice(2);
try {
  if (process.platform !== 'linux' || process.getuid() !== 10001 || process.getgid() !== 10001 || Object.values(networkInterfaces()).flat().some(address => !address.internal)) throw new Error();
  if (!isAbsolute(target) || resolve(target) !== target || target === '/srv/cwt' || target.startsWith('/srv/cwt/') || await realpath(target) !== target || await realpath(process.env.PGHOST) !== process.env.PGHOST) throw new Error();
  const sourceRoot = await realpath(source);
  if (target === sourceRoot || target.startsWith(`${sourceRoot}/`) || sourceRoot.startsWith(`${target}/`)) throw new Error();
  const set = JSON.parse(await readFile(join(source, 'set.json'), 'utf8'));
  if (set.kind !== 'weekly' || set.schemaVersion !== 1 || !/^[a-zA-Z0-9_]+$/.test(process.env.PGDATABASE) || !/^[a-zA-Z0-9_]+$/.test(process.env.PGUSER)) throw new Error();
  if (action === 'prepare') {
    if ((await readdir(target)).length) throw new Error();
    await chmod(target, 0o700);
  } else if (action === 'copy') {
    if ((await readdir(target)).length) throw new Error();
    for (const partition of ['public', 'private', 'import']) await mkdir(join(target, partition), { mode: 0o700 });
    for (const file of set.files.filter(file => file.path.startsWith('media/'))) {
      const relative = file.path.slice(6);
      if (!/^(public|private)\/[a-zA-Z0-9_./-]+$/.test(relative) || relative.split('/').some(part => !part || part === '.' || part === '..')) throw new Error();
      const destination = join(target, relative);
      await mkdir(dirname(destination), { recursive: true, mode: 0o700 });
      if (!(await lstat(join(source, file.path))).isFile()) throw new Error();
      await copyFile(join(source, file.path), destination, 1);
      await chmod(destination, 0o600);
    }
    // Informational settings only; not an activation token or auto-loaded source config.
    await writeFile(join(target, 'restore-safety.json'), JSON.stringify({
      APP_ENV: 'test', NON_PRODUCTION_NOINDEX: true, ANALYTICS_DRIVER: 'disabled',
      EMAIL_DRIVER: 'log', INQUIRY_NOTIFICATION_TO: 'restore-sink@example.test',
      FEATURE_AI: false, FEATURE_SEO_ASSISTANT: false,
      access: 'Linux network namespace has loopback only; no Web/Worker start is provided.',
      sourceConfig: 'Retained inside the source backup for review; never sourced.',
    }) + '\n', { mode: 0o600, flag: 'wx' });
  } else throw new Error();
} catch { process.stderr.write('Restore filesystem or isolation check failed.\n'); process.exitCode = 1; }
