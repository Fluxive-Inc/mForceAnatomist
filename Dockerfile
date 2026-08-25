# Build stage
FROM node:20-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN apk add --no-cache git build-base
RUN npm install
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY --from=builder /app/dist/m-force-anatomist/browser ./dist
# db.js MUST be here: server.js does require('./db') on line 3, so without it
# the container throws MODULE_NOT_FOUND at boot and the revision never becomes
# healthy. The old pipeline had no smoke test, so this shipped silently.
COPY server.js perimeter-guard.js perimeter.html db.js ./

EXPOSE 8080
ENV PORT=8080
ENV NODE_ENV=production

CMD ["node", "server.js"]
