# ---- Stage 1: Build ----
FROM node:20-alpine AS build
WORKDIR /app

# Copy package files first for dependency caching
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build
COPY . .

# Build arg for API key (passed at build time)
ARG GEMINI_API_KEY=""
ENV GEMINI_API_KEY=${GEMINI_API_KEY}

RUN npm run build

# ---- Stage 2: Serve with Nginx ----
FROM nginx:alpine

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from build stage
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
