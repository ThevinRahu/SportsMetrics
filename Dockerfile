FROM node:22-slim AS build

WORKDIR /app

# Copy package files first for better caching
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy source
COPY . .

# Build
RUN npm run build

# Output stage - just the static files
FROM scratch
COPY --from=build /app/dist /opt/static_app
