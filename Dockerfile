FROM node:20-slim AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app/backend

COPY backend/package*.json ./
RUN npm ci --production=false

COPY backend/prisma ./prisma/
RUN npx prisma generate

COPY backend/tsconfig*.json ./
COPY backend/src ./src
RUN npx tsc -p tsconfig.build.json


FROM node:20-slim AS runner

WORKDIR /app/backend

COPY --from=builder /app/backend/node_modules ./node_modules
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/prisma ./prisma
COPY --from=builder /app/backend/package*.json ./

ENV NODE_ENV=production
EXPOSE 3000

CMD ["sh", "-c", "cd backend && npx prisma migrate deploy && node dist/src/index.js"]
