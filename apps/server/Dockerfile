FROM node:20-slim

WORKDIR /app

# Copy root package files for workspace resolution
COPY package.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/server/package.json apps/server/

# Install dependencies
RUN npm install --workspace=apps/server

# Copy source
COPY packages/shared/ packages/shared/
COPY apps/server/ apps/server/

# Build TypeScript
RUN npm run build --workspace=apps/server

EXPOSE 8080

CMD ["node", "apps/server/dist/index.js"]
