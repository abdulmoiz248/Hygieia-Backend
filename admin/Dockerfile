# Stage 1: Build
FROM node:20-alpine AS build

WORKDIR /app

RUN apk add --no-cache git python3 make g++

COPY package*.json ./
RUN npm config set fetch-retry-maxtimeout 600000 && npm config set fetch-retries 5 && npm ci --legacy-peer-deps

COPY tsconfig*.json nest-cli.json ./
COPY src ./src

RUN npm run build

# Stage 2: Production
FROM node:20-alpine AS prod

WORKDIR /app

# Copy package.json and install ALL dependencies (prod + dev) to avoid build failures
COPY package*.json ./
RUN npm config set fetch-retry-maxtimeout 600000 && npm config set fetch-retries 5 && npm ci --legacy-peer-deps

# Copy compiled output from build stage
COPY --from=build /app/dist ./dist

ARG ADMIN_MS_PORT=4011
ENV ADMIN_MS_PORT=$ADMIN_MS_PORT
EXPOSE $ADMIN_MS_PORT

CMD ["node", "dist/main.js"]
