FROM node:22-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json prisma.config.ts ./
COPY prisma/ prisma/
COPY src/ src/

ENV DATABASE_URL="file:./data/inkbot3.db"
RUN npx prisma generate
RUN npm run build

FROM node:22-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends sqlite3 && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist/ dist/
COPY --from=build /app/generated/ generated/
COPY prisma/ prisma/
COPY prisma.config.ts ./
COPY entrypoint.sh ./

COPY .sqliterc /home/appuser/.sqliterc

RUN chmod +x entrypoint.sh \
    && adduser --disabled-password --gecos '' appuser \
    && mkdir -p data \
    && chown -R appuser:appuser /app

USER appuser

ENTRYPOINT ["./entrypoint.sh"]
