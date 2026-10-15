FROM node:22-bookworm-slim
WORKDIR /app

COPY JalynsBackend/package.json JalynsBackend/package-lock.json ./
RUN npm ci

COPY JalynsBackend/tsconfig.json ./
COPY JalynsBackend/src ./src
RUN npm run build && npm prune --omit=dev

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["node", "dist/server.js"]
