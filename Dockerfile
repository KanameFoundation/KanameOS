# Stage 1: Builder
FROM node:20-alpine AS builder

WORKDIR /usr/src/osjs

# Install build dependencies
# (python3, make, g++ might be needed for some native modules)
RUN apk add --no-cache python3 make g++ git

COPY package*.json ./
COPY . .
RUN npm ci
RUN npm run bm

# Stage 2: Runner
FROM node:20-alpine

WORKDIR /usr/src/kaname

# Copy built assets and server code
COPY --from=builder /usr/src/osjs/dist ./dist
COPY --from=builder /usr/src/osjs/src ./src
COPY --from=builder /usr/src/osjs/package.json ./
COPY --from=builder /usr/src/osjs/packages.json ./
# Copy initial VFS template (optional, if you want to seed it)
COPY --from=builder /usr/src/osjs/vfs ./vfs

# Install only production dependencies
RUN npm i --omit=dev

# Regenerate packages.json with correct paths
RUN node src/scripts/discover.js

## src is already copied from builder, no need to copy again

# Expose port
EXPOSE 8000

# set permissions for node user
RUN chown -R node:node /usr/src/kaname

USER node

# Environment variables for persistence
ENV NODE_ENV=production

CMD ["node", "src/server/index.js"]
