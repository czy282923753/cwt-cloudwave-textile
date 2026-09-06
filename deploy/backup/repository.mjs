// Repository selection contains no credentials and has no remote/local fallback.
export function selectBackupRepository(env) {
  if (env.BACKUP_ENVIRONMENT === 'synthetic' && ['test', 'local'].includes(env.APP_ENV)) {
    const local = `${env.BACKUP_ROOT}/restic`;
    if (env.RESTIC_REPOSITORY && env.RESTIC_REPOSITORY !== local) throw new Error('repository');
    return local;
  }
  const environment = env.BACKUP_ENVIRONMENT;
  if (!['production', 'staging'].includes(environment) || env.APP_ENV !== environment) throw new Error('environment');
  for (const [field, suffix] of [
    ['COS_ACCESS_KEY_ID_FILE', 'cos-access-key-id'], ['COS_SECRET_ACCESS_KEY_FILE', 'cos-secret-key'],
    ['BACKUP_REPOSITORY_PASSWORD_FILE', 'backup-password'],
  ]) if (env[field] !== `/run/secrets/${environment}-${suffix}`) throw new Error('secret path');
  const repository = env.BACKUP_COS_REPOSITORY;
  const match = /^s3:https:\/\/cos\.ap-singapore\.myqcloud\.com\/([a-z0-9][a-z0-9-]*-[0-9]+)\/(production|staging)$/.exec(repository ?? '');
  if (!match || match[2] !== environment || (env.RESTIC_REPOSITORY && env.RESTIC_REPOSITORY !== repository)) throw new Error('repository');
  return repository;
}
if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  try { process.stdout.write(selectBackupRepository(process.env)); }
  catch { process.stderr.write('Backup repository configuration refused.\n'); process.exitCode = 1; }
}
