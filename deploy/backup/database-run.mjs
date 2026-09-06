// libpq does not expand a connection URI supplied through PGDATABASE. Keep the
// mounted URI and its password out of argv/logs; translate to child-only libpq env.
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const [tool, ...args] = process.argv.slice(2);
try {
  if (!['psql', 'pg_dump'].includes(tool)) throw new Error();
  const env = { ...process.env };
  if (env.DATABASE_URL_FILE) {
    const url = new URL(readFileSync(env.DATABASE_URL_FILE, 'utf8').trim());
    if (!['postgres:', 'postgresql:'].includes(url.protocol) || url.hash) throw new Error();
    for (const key of Object.keys(env)) if (key.startsWith('PG')) delete env[key];
    const fields = { host: 'PGHOST', hostaddr: 'PGHOSTADDR', port: 'PGPORT', dbname: 'PGDATABASE', user: 'PGUSER', password: 'PGPASSWORD', sslmode: 'PGSSLMODE', sslrootcert: 'PGSSLROOTCERT', sslcert: 'PGSSLCERT', sslkey: 'PGSSLKEY', connect_timeout: 'PGCONNECT_TIMEOUT', application_name: 'PGAPPNAME', options: 'PGOPTIONS', target_session_attrs: 'PGTARGETSESSIONATTRS', channel_binding: 'PGCHANNELBINDING' };
    env.PGHOST = url.hostname.replace(/^\[|\]$/g, '');
    env.PGPORT = url.port || '5432';
    env.PGDATABASE = decodeURIComponent(url.pathname.slice(1));
    env.PGUSER = decodeURIComponent(url.username);
    env.PGPASSWORD = decodeURIComponent(url.password);
    for (const [key, value] of url.searchParams) {
      if (!fields[key] || url.searchParams.getAll(key).length !== 1) throw new Error();
      env[fields[key]] = value;
    }
    if (!env.PGHOST || !env.PGUSER || !env.PGDATABASE) throw new Error();
    env.PGCONNECT_TIMEOUT = '10';
  }
  delete env.DATABASE_URL;
  const result = spawnSync(tool, args, { env, stdio: 'inherit' });
  process.exitCode = result.status ?? 1;
} catch {
  process.stderr.write('Backup database connection configuration refused.\n');
  process.exitCode = 1;
}
