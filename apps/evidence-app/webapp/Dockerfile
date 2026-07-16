# Stage 1: build the React app
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --legacy-peer-deps

COPY . .
RUN npm run build

# Stage 2: serve dist/ via the Node proxy server (index.js)
FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY package.json ./
COPY index.js ./

EXPOSE 8080

CMD ["node", "index.js"]
