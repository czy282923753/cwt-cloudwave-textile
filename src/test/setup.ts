process.env.APP_ENV ??= "test";
process.env.NON_PRODUCTION_NOINDEX ??= "true";
process.env.DATABASE_DRIVER ??= "pglite";
process.env.PGLITE_DATA_DIR ??= "memory://";
process.env.AUTH_SESSION_SECRET ??=
  "test-only-session-secret-with-more-than-32-characters";
process.env.AUTH_COOKIE_NAME ??= "cwt_test_session";
process.env.STORAGE_DRIVER ??= "local";
process.env.PUBLIC_STORAGE_ROOT ??= ".data/test-storage/public";
process.env.PRIVATE_STORAGE_ROOT ??= ".data/test-storage/private";
process.env.IMPORT_STORAGE_ROOT ??= ".data/test-storage/imports";
process.env.FILE_SCAN_DRIVER ??= "development";
