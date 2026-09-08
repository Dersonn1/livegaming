# Multi-stage build for @live/backend, run from the MONOREPO ROOT:
#   docker build -f apps/backend/Dockerfile -t live-backend .
# (see docker/docker-compose.yml, which does exactly this).

FROM node:20-slim AS base
WORKDIR /repo

FROM base AS deps
COPY package.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm install --workspace=@live/backend --workspace=@live/shared --include-workspace-root

FROM deps AS build
COPY packages/shared packages/shared
COPY apps/backend apps/backend
RUN npm run build -w @live/backend

FROM node:20-slim AS runtime
WORKDIR /repo
ENV NODE_ENV=production
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/packages/shared ./packages/shared
COPY --from=build /repo/apps/backend/node_modules ./apps/backend/node_modules
COPY --from=build /repo/apps/backend/dist ./apps/backend/dist
COPY --from=build /repo/apps/backend/package.json ./apps/backend/package.json

WORKDIR /repo/apps/backend
EXPOSE 4000
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=5 \
  CMD node -e "fetch('http://localhost:4000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/server.js"]
