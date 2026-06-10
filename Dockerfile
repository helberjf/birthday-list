FROM node:24-bookworm-slim

WORKDIR /app

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable && corepack prepare pnpm@10.29.3 --activate

COPY . .

RUN pnpm install --frozen-lockfile
RUN pnpm run build:vercel

ENV NODE_ENV=production
ENV DATABASE_PROVIDER=postgres
ENV SERVE_STATIC_FRONTEND=true
ENV PORT=3000

EXPOSE 3000

CMD ["sh", "-c", "pnpm --filter @workspace/db run push && node --enable-source-maps artifacts/api-server/dist/index.mjs"]
