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

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist/ dist/
COPY --from=build /app/generated/ generated/
COPY --from=build /app/node_modules/.prisma/ node_modules/.prisma/
COPY prisma/ prisma/
COPY prisma.config.ts ./
COPY entrypoint.sh ./

RUN chmod +x entrypoint.sh

ENTRYPOINT ["./entrypoint.sh"]
