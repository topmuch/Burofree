FROM node:20-alpine
RUN apk add --no-cache git
WORKDIR /app

# Clone the repository
RUN git clone https://github.com/topmuch/Burofree.git .

# Install dependencies
RUN npm install --legacy-peer-deps

# Generate Prisma Client
RUN npx prisma generate

# Build the application
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=development
ENV DATABASE_URL=file:/app/data/burofree.db
ENV REDIS_URL=redis://localhost:6379
RUN npm run build

# Create data directory
RUN mkdir -p /app/data /app/public/uploads

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV DATABASE_URL=file:/app/data/burofree.db
ENV REDIS_URL=redis://localhost:6379

# Start command - push schema and start server
CMD sh -c "mkdir -p /app/data /app/public/uploads && npx prisma db push --skip-generate 2>/dev/null || true && exec node .next/standalone/server.js"
