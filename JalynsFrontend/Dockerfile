FROM node:22-bookworm-slim AS build
WORKDIR /app

# Dokploy builds from the repository root, not from this folder.
COPY JalynsFrontend/package.json JalynsFrontend/package-lock.json ./
RUN npm ci

COPY JalynsFrontend/ ./

ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_API_URL
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

FROM nginx:1.27-alpine
COPY JalynsFrontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
