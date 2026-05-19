FROM node:20-alpine
RUN apk add --no-cache git libc6-compat openssl
WORKDIR /app
RUN git clone https://github.com/topmuch/Burofree.git . && rm -rf .git
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=development
ENV DATABASE_URL=file:/app/data/burofree.db
ENV REDIS_URL=redis://localhost:6379
RUN npm install
RUN npx prisma generate
RUN npm run build
RUN mkdir -p /app/data /app/public/uploads
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD sh -c "npx prisma db push --skip-generate 2>/dev/null || true && node .next/standalone/server.js"
