FROM node:20-alpine AS ui-build
WORKDIR /app/ui
RUN npm install -g pnpm
COPY ui/package.json ui/pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile
COPY ui/ ./
RUN pnpm build

FROM denoland/deno:2.3.3
WORKDIR /app
COPY deno.json ./
COPY server/ ./server/
COPY --from=ui-build /app/ui/dist ./ui/dist

RUN deno cache server/main.ts

VOLUME ["/app/data"]
EXPOSE 3100

ENV TELOS_PORT=3100
ENV TELOS_DATA_DIR=/app/data
ENV TELOS_UI_DIR=/app/ui/dist
ENV TELOS_OPEN_BROWSER=false

CMD ["deno", "run", "-A", "server/main.ts"]
