# Single source of truth for the Node version used by all stages.
# Node 26 "Lithium" — Active LTS since 2026-10-28.
ARG NODE_VERSION=26

######################################################################################################
#############################                  STAGE 1: BUILD                   ######################
######################################################################################################

FROM node:${NODE_VERSION}-slim AS builder

# Apply available OS security patches before building.
RUN apt-get update && apt-get upgrade -y && rm -rf /var/lib/apt/lists/*

# node:26-slim no longer ships corepack, so install the pinned pnpm directly.
RUN npm install -g pnpm@12.3.4

WORKDIR /build

# Next.js collects anonymous telemetry by default; a lab build has no use for it.
ENV NEXT_TELEMETRY_DISABLED=1

# Install dependencies first (better layer caching). Copy only manifests.
# --ignore-scripts: the production image needs no package build scripts, and
# skipping them avoids pnpm's interactive build-approval gate in CI.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts

# Copy the sources and build: `next build` emits the self-contained standalone
# server, then esbuild bundles the migrate + seed scripts into single files so
# the runtime image needs no extra dependencies to run them.
COPY tsconfig.json next.config.ts postcss.config.mjs ./
COPY public ./public
COPY src ./src
COPY drizzle ./drizzle
RUN pnpm build

######################################################################################################
#############################                  STAGE 2: RUNTIME                 ######################
######################################################################################################

FROM node:${NODE_VERSION}-slim AS runtime

# Apply OS security patches on top of the base image.
RUN apt-get update && apt-get upgrade -y && rm -rf /var/lib/apt/lists/*

# Drop the bundled npm (and npx) from the base image. The app is installed with
# pnpm at build time and started with `node server.js`, so npm is never used at
# runtime — but its own dependencies (undici, brace-expansion, …) carry fixable
# CVEs that would otherwise fail the Trivy image gate. Removing it also shrinks
# the attack surface.
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx

# Non-root user to run the app.
RUN useradd --create-home --uid 10001 appuser

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000

WORKDIR /app

# The standalone server (with only the dependencies it traces), the static
# assets Next does not copy into it, the migrate/seed bundles and the migrations.
COPY --from=builder /build/.next/standalone ./
COPY --from=builder /build/.next/static ./.next/static
COPY --from=builder /build/public ./public
COPY --from=builder /build/dist/db ./db
COPY --from=builder /build/drizzle ./drizzle

# Copy the entrypoint that migrates + seeds before starting the server.
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Bake the challenge flag into the image at build time. The seed script reads it
# from the environment and writes it into the victim's order. The flag is
# intentionally NOT committed to the repo (it would spoil the lab).
# Override with --build-arg FLAG=...
ARG FLAG=FLAG{OPSDECK_HIDDEN_ADMIN}
ENV FLAG=${FLAG}

USER appuser

EXPOSE 3000

# Health check hits the app's /healthz endpoint (returns the literal "ok").
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:3000/healthz').then(r=>r.text()).then(t=>process.exit(t==='ok'?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["node", "server.js"]
