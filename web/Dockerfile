FROM node:20-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* vars are baked into the JS bundle at build time.
# They must be passed as build args, not runtime env vars.
ARG NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
ARG NEXT_PUBLIC_AUTH0_DOMAIN
ARG NEXT_PUBLIC_AUTH0_CLIENT_ID
ARG NEXT_PUBLIC_AUTH0_AUDIENCE
ARG NEXT_PUBLIC_MAPBOX_PUBLIC_TOKEN
ARG NEXT_PUBLIC_MAPBOX_STYLE=mapbox://styles/mapbox/dark-v11

ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_AUTH0_DOMAIN=$NEXT_PUBLIC_AUTH0_DOMAIN
ENV NEXT_PUBLIC_AUTH0_CLIENT_ID=$NEXT_PUBLIC_AUTH0_CLIENT_ID
ENV NEXT_PUBLIC_AUTH0_AUDIENCE=$NEXT_PUBLIC_AUTH0_AUDIENCE
ENV NEXT_PUBLIC_MAPBOX_PUBLIC_TOKEN=$NEXT_PUBLIC_MAPBOX_PUBLIC_TOKEN
ENV NEXT_PUBLIC_MAPBOX_STYLE=$NEXT_PUBLIC_MAPBOX_STYLE

RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
