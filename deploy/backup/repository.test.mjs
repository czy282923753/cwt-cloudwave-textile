import assert from 'node:assert/strict';
import test from 'node:test';
import { selectBackupRepository } from './repository.mjs';

test('protected repositories require matching environment, HTTPS COS prefix and exact secret custody', () => {
  for (const name of ['production', 'staging']) {
    const env = { APP_ENV: name, BACKUP_ENVIRONMENT: name, BACKUP_COS_REPOSITORY: `s3:https://cos.ap-singapore.myqcloud.com/synthetic-backup-123456/${name}`,
      COS_ACCESS_KEY_ID_FILE: `/run/secrets/${name}-cos-access-key-id`, COS_SECRET_ACCESS_KEY_FILE: `/run/secrets/${name}-cos-secret-key`, BACKUP_REPOSITORY_PASSWORD_FILE: `/run/secrets/${name}-backup-password` };
    assert.equal(selectBackupRepository(env), env.BACKUP_COS_REPOSITORY);
    for (const patch of [
      { APP_ENV: 'test' }, { BACKUP_COS_REPOSITORY: undefined }, { BACKUP_COS_REPOSITORY: '/local/fallback' },
      { BACKUP_COS_REPOSITORY: env.BACKUP_COS_REPOSITORY.replace('https:', 'http:') },
      { BACKUP_COS_REPOSITORY: env.BACKUP_COS_REPOSITORY.replace(`/${name}`, name === 'production' ? '/staging' : '/production') },
      { BACKUP_COS_REPOSITORY: `${env.BACKUP_COS_REPOSITORY}/extra` },
      { BACKUP_COS_REPOSITORY: env.BACKUP_COS_REPOSITORY.replace('myqcloud.com', 'example.test') },
      { COS_ACCESS_KEY_ID_FILE: '/wrong' }, { COS_SECRET_ACCESS_KEY_FILE: '/wrong' }, { BACKUP_REPOSITORY_PASSWORD_FILE: '/wrong' }, { RESTIC_REPOSITORY: '/fallback' },
    ]) assert.throws(() => selectBackupRepository({ ...env, ...patch }));
  }
  const synthetic = { APP_ENV: 'test', BACKUP_ENVIRONMENT: 'synthetic', BACKUP_ROOT: '/lab/backups' };
  assert.equal(selectBackupRepository(synthetic), '/lab/backups/restic');
  assert.throws(() => selectBackupRepository({ ...synthetic, APP_ENV: 'production' }));
  assert.throws(() => selectBackupRepository({ ...synthetic, RESTIC_REPOSITORY: 's3:https://example.test/bucket' }));
});
