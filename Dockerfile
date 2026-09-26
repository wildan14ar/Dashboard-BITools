FROM oven/bun:1 AS builder

ARG DATABASE_URL=postgresql://portonext:portonext@localhost:5432/portonext?sslmode=disable

ENV DATABASE_URL=$DATABASE_URL

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY prisma/ ./prisma/
RUN bun run db:generate

COPY . .
RUN bun run build

FROM oven/bun:1 AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# oven/bun:1 (Debian trixie slim) tidak menyediakan addgroup/adduser,
# tapi sudah ada user non-root bawaan `bun` (uid:gid 1000:1000) — pakai itu.
# Ownership diatur via COPY --chown (RUN chown -R gagal EPERM di builder klasik).
USER bun

COPY --chown=bun:bun --from=builder /app/public ./public
COPY --chown=bun:bun --from=builder /app/.next ./.next
COPY --chown=bun:bun --from=builder /app/package.json ./package.json
COPY --chown=bun:bun --from=builder /app/node_modules ./node_modules
COPY --chown=bun:bun --from=builder /app/next.config.ts ./next.config.ts
COPY --chown=bun:bun --from=builder /app/prisma ./prisma
COPY --chown=bun:bun --from=builder /app/tsconfig.json ./tsconfig.json
COPY --chown=bun:bun --from=builder /app/next-env.d.ts ./next-env.d.ts

EXPOSE 3000

CMD ["bun", "run", "start"]
