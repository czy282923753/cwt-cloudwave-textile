# syntax=docker/dockerfile:1.20@sha256:26147acbda4f14c5add9946e2fd2ed543fc402884fd75146bd342a7f6271dc1d

ARG NODE_IMAGE=node:24.14.0-bookworm-slim@sha256:d8e448a56fc63242f70026718378bd4b00f8c82e78d20eefb199224a4d8e33d8

# Tool acquisition is outside the network-none final build and enters the existing dependency bundle.
FROM postgres:18.4-bookworm@sha256:882236b897e39051d2368c5ccc6cda944904723506b2dfc97f2a8f5bc9afa382 AS backup-postgresql-tools
RUN mkdir -p /backup-root/usr/local/bin \
  && for tool in pg_dump pg_restore psql; do \
    cp /usr/lib/postgresql/18/bin/$tool /backup-root/usr/local/bin/$tool; \
    ldd /usr/lib/postgresql/18/bin/$tool; \
  done > /tmp/backup-libraries \
  && awk '/=> \// { print $3 } /^[[:space:]]*\// { print $1 }' /tmp/backup-libraries | sort -u | \
    while read -r library; do \
      canonical_directory="$(readlink -f "$(dirname "$library")")"; \
      library_name="$(basename "$library")"; \
      case "$canonical_directory" in /usr/lib|/usr/lib/*|/usr/lib64|/usr/lib64/*) ;; *) exit 1 ;; esac; \
      mkdir -p "/backup-root$canonical_directory"; \
      cp -L "$library" "/backup-root$canonical_directory/$library_name"; \
    done

FROM node:24.14.0-bookworm@sha256:5a593d74b632d1c6f816457477b6819760e13624455d587eef0fa418c8d0777b AS dependency-acquisition
ARG TARGETARCH
WORKDIR /workspace
COPY --from=backup-postgresql-tools /backup-root /dependency/backup-root
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN corepack enable \
  && corepack prepare pnpm@11.9.0 --activate \
  && test "$(pnpm --version)" = "11.9.0" \
  && pnpm fetch --frozen-lockfile --store-dir /dependency/pnpm-store \
  && PNPM_ENTRY="$(find /root/.cache/node/corepack -type f -path '*/bin/pnpm.cjs' -print -quit)" \
  && test -n "${PNPM_ENTRY}" \
  && mkdir -p /dependency/pnpm \
  && cp -a "$(dirname "$(dirname "${PNPM_ENTRY}")")/." /dependency/pnpm/
RUN TARGETARCH="${TARGETARCH}" node <<'EOF'
const { createHash } = require("node:crypto");
const { execFileSync } = require("node:child_process");
const { chmodSync, mkdirSync, writeFileSync } = require("node:fs");
(async () => {
async function fetchBytesWithRetry(url) {
  let lastFailure;
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(60_000) });
      if (response.ok) return Buffer.from(await response.arrayBuffer());
      lastFailure = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastFailure = error;
    }
    if (attempt < 5) await new Promise((resolve) => setTimeout(resolve, attempt * 1_000));
  }
  throw lastFailure;
}
const identities = {
  amd64: { asset: "supercronic-linux-amd64", sha256: "88c1b66b94c486f972fdd1a4d1f901e3e75ff04f749cddd60c5db573e3a33c6c" },
  arm64: { asset: "supercronic-linux-arm64", sha256: "50ae8755e04fa72812d0a1bc47a112a856811cc91cce7b6c875c378a850788bc" },
};
const identity = identities[process.env.TARGETARCH];
if (!identity) throw new Error("Unsupported dependency platform.");
const bytes = await fetchBytesWithRetry(`https://github.com/aptible/supercronic/releases/download/v0.2.48/${identity.asset}`);
if (createHash("sha256").update(bytes).digest("hex") !== identity.sha256) {
  throw new Error("Supercronic checksum mismatch.");
}
mkdirSync("/dependency/bin", { recursive: true });
writeFileSync("/dependency/bin/supercronic", bytes);
chmodSync("/dependency/bin/supercronic", 0o555);
const resticHashes = {
  amd64: "f415415624dcc452f2a02b8c33641791a8c6d6d3b65bbb3543fcf9a25151585c",
  arm64: "a5f64aaab53d51e311fa3829124c5b703f2d14cf187d8640b6be3b2b49376465",
};
const resticBytes = await fetchBytesWithRetry(`https://github.com/restic/restic/releases/download/v0.19.1/restic_0.19.1_linux_${process.env.TARGETARCH}.bz2`);
if (createHash("sha256").update(resticBytes).digest("hex") !== resticHashes[process.env.TARGETARCH]) throw new Error("Restic checksum mismatch.");
writeFileSync("/dependency/backup-root/usr/local/bin/restic", execFileSync("bzip2", ["--decompress", "--stdout"], { input: resticBytes, maxBuffer: 128 * 1024 * 1024 }));
chmodSync("/dependency/backup-root/usr/local/bin/restic", 0o555);
})().catch((error) => { console.error(error.message); process.exit(1); });
EOF

FROM scratch AS dependency-bundle
COPY --from=dependency-acquisition /dependency/ /

ARG TARGETARCH
FROM deps-${TARGETARCH} AS dependency-input

FROM ${NODE_IMAGE} AS build
ARG CWT_RELEASE_ID
ARG SOURCE_DATE_EPOCH
ENV CWT_RELEASE_ID=${CWT_RELEASE_ID} \
    SOURCE_DATE_EPOCH=${SOURCE_DATE_EPOCH} \
    NEXT_TELEMETRY_DISABLED=1 \
    PNPM_HOME=/opt/pnpm
WORKDIR /app
COPY --from=dependency-input /pnpm-store /opt/pnpm/store
COPY --from=dependency-input /pnpm /opt/pnpm/runtime
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --network=none test "$(node /opt/pnpm/runtime/bin/pnpm.cjs --version)" = "11.9.0" \
  && node /opt/pnpm/runtime/bin/pnpm.cjs install --offline --frozen-lockfile --trust-lockfile --store-dir /opt/pnpm/store
COPY . .
RUN --network=none test "$(node --version)" = "v24.14.0" \
  && test "$(node /opt/pnpm/runtime/bin/pnpm.cjs --version)" = "11.9.0" \
  && test "$(node -p "require('next/package.json').version")" = "16.2.12" \
  && test "$(node -p "require('tsx/package.json').version")" = "4.23.1" \
  && node /opt/pnpm/runtime/bin/pnpm.cjs build \
  && mv node_modules /tmp/build-node_modules \
  && node /opt/pnpm/runtime/bin/pnpm.cjs install --prod --offline --frozen-lockfile --trust-lockfile --store-dir /opt/pnpm/store \
  && rm -rf /tmp/build-node_modules \
  && rm -rf .next/cache .next/trace .next/trace-build /tmp/node-compile-cache \
  && rm -f node_modules/.modules.yaml node_modules/.pnpm-workspace-state-v1.json \
  && test "$(cat .next/BUILD_ID)" = "${CWT_RELEASE_ID}"

FROM ${NODE_IMAGE} AS runtime
ARG CWT_RELEASE_ID
ARG SOURCE_DATE_EPOCH
ARG TARGETARCH
LABEL org.opencontainers.image.revision=${CWT_RELEASE_ID} \
      org.opencontainers.image.created=${SOURCE_DATE_EPOCH} \
      org.opencontainers.image.title="CloudWave Textile application"
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    CWT_RELEASE_ID=${CWT_RELEASE_ID}
WORKDIR /app
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack /usr/local/lib/node_modules/yarn /opt/yarn-v1.22.22 \
  && rm -f /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack /usr/local/bin/pnpm /usr/local/bin/pnpx /usr/local/bin/yarn /usr/local/bin/yarnpkg \
  && groupadd --gid 10001 cwt \
  && useradd --uid 10001 --gid 10001 --home-dir /nonexistent --shell /usr/sbin/nologin cwt
COPY --from=dependency-input /backup-root/ /
COPY --from=dependency-input --chmod=0555 /bin/supercronic /usr/local/bin/supercronic
COPY --from=build --chown=10001:10001 /app/.next/standalone ./.next/standalone
COPY --from=build --chown=10001:10001 /app/.next/static ./.next/standalone/.next/static
COPY --from=build --chown=10001:10001 /app/public ./.next/standalone/public
COPY --from=build --chmod=0444 /app/deploy/scripts/preflight-image.mjs /usr/local/lib/cwt-preflight-image.mjs
RUN cd /app/.next/standalone \
  && node /usr/local/lib/cwt-preflight-image.mjs sharp-smoke --root . --platform "linux/${TARGETARCH}"
COPY --from=build --chown=10001:10001 /app/node_modules ./node_modules
COPY --from=build --chown=10001:10001 /app/package.json /app/tsconfig.json ./
COPY --from=build --chown=10001:10001 /app/scripts ./scripts
COPY --from=build --chown=10001:10001 /app/src ./src
COPY --from=build --chown=10001:10001 /app/deploy/schedule ./deploy/schedule
COPY --from=build --chown=10001:10001 /app/deploy/backup ./deploy/backup
COPY --from=build --chown=10001:10001 /app/deploy/proxy/nginx.conf ./deploy/proxy/nginx.conf
COPY --from=build --chown=10001:10001 /app/compose.yaml ./compose.yaml
RUN pg_dump --version | grep -Eq 'PostgreSQL\) 18\.' \
  && pg_restore --version | grep -Eq 'PostgreSQL\) 18\.' \
  && psql --version | grep -Eq 'PostgreSQL\) 18\.' \
  && restic version | grep -q '^restic 0.19.1 ' \
  && command -v flock && command -v sha256sum
RUN test "$(node --version)" = "v24.14.0" \
  && test "$(node -p "require('tsx/package.json').version")" = "4.23.1" \
  && test "$(node -p "require('typescript/package.json').version")" = "5.9.3" \
  && for path in \
    /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack /usr/local/bin/pnpm /usr/local/bin/pnpx \
    /usr/local/bin/yarn /usr/local/bin/yarnpkg \
    /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack /usr/local/lib/node_modules/yarn \
    /opt/yarn-v1.22.22; do test ! -e "$path" && test ! -L "$path"; done \
  && test ! -e /app/node_modules/.modules.yaml \
  && chown -R 10001:10001 /app
USER 10001:10001
EXPOSE 3000
CMD ["node", ".next/standalone/server.js"]
