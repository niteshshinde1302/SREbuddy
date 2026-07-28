# Stage 1: Build dependencies
FROM node:20-alpine AS builder

WORKDIR /app

# Copy manifests
COPY src/ui/package.json .
COPY src/ui/package-lock.json .

# Install dependencies
RUN npm ci

#Copu rest of the app
COPY src/ui/ .

# Build the application
RUN npm run build

# Stage 2: Runtime / Build the application
FROM nginx:alpine AS runtime

COPY --from=builder /app/dist /usr/share/nginx/html
COPY images/ui/default.conf /etc/nginx/conf.d/default.conf
