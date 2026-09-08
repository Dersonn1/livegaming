# Multi-stage build for @live/dashboard, run from the MONOREPO ROOT:
#   docker build -f apps/dashboard/Dockerfile -t live-dashboard .

FROM node:20-slim AS base
WORKDIR /repo

FROM base AS deps
COPY package.json ./
COPY apps/dashboard/package.json apps/dashboard/package.json
RUN npm install --workspace=@live/dashboard --include-workspace-root

FROM deps AS build
COPY apps/dashboard apps/dashboard
ARG NEXT_PUBLIC_API_URL=http://localhost:4000
ARG NEXT_PUBLIC_WS_URL=ws://localhost:4000/ws
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL
RUN npm run build -w @live/dashboard

FROM node:20-slim AS runtime
WORKDIR /repo/apps/dashboard
ENV NODE_ENV=production
COPY --from=build /repo/node_modules /repo/node_modules
COPY --from=build /repo/apps/dashboard/.next ./.next
COPY --from=build /repo/apps/dashboard/public ./public
COPY --from=build /repo/apps/dashboard/package.json ./package.json
COPY --from=build /repo/apps/dashboard/next.config.js ./next.config.js

EXPOSE 3000
CMD ["npm", "run", "start"]
