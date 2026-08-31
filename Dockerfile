# syntax=docker/dockerfile:1.20@sha256:26147acbda4f14c5add9946e2fd2ed543fc402884fd75146bd342a7f6271dc1d

ARG NODE_IMAGE=node:24.14.0-bookworm-slim@sha256:d8e448a56fc63242f70026718378bd4b00f8c82e78d20eefb199224a4d8e33d8

FROM ${NODE_IMAGE} AS dependency-acquisition
ARG TARGETARCH
WORKDIR /workspace
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
LABEL org.opencontainers.image.revision=${CWT_RELEASE_ID} \
      org.opencontainers.image.created=${SOURCE_DATE_EPOCH} \
      org.opencontainers.image.title="CloudWave Textile application"
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    CWT_RELEASE_ID=${CWT_RELEASE_ID}
WORKDIR /app
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack \
  && rm -f /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack /usr/local/bin/pnpm /usr/local/bin/pnpx \
  && groupadd --gid 10001 cwt \
  && useradd --uid 10001 --gid 10001 --home-dir /nonexistent --shell /usr/sbin/nologin cwt
COPY --from=dependency-input --chmod=0555 /bin/supercronic /usr/local/bin/supercronic
COPY --from=build --chown=10001:10001 /app/.next/standalone ./.next/standalone
COPY --from=build --chown=10001:10001 /app/.next/static ./.next/standalone/.next/static
COPY --from=build --chown=10001:10001 /app/public ./.next/standalone/public
COPY --from=build --chown=10001:10001 /app/node_modules ./node_modules
COPY --from=build --chown=10001:10001 /app/package.json /app/tsconfig.json ./
COPY --from=build --chown=10001:10001 /app/scripts ./scripts
COPY --from=build --chown=10001:10001 /app/src ./src
COPY --from=build --chown=10001:10001 /app/deploy/schedule ./deploy/schedule
RUN test "$(node --version)" = "v24.14.0" \
  && test "$(node -p "require('tsx/package.json').version")" = "4.23.1" \
  && test ! -e /usr/local/bin/npm \
  && test ! -e /usr/local/bin/corepack \
  && test ! -e /app/node_modules/.modules.yaml \
  && chown -R 10001:10001 /app
USER 10001:10001
EXPOSE 3000
CMD ["node", ".next/standalone/server.js"]
