FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json yarn.lock ./
COPY .yarn ./.yarn
COPY .pnp.cjs ./
COPY .pnp.loader.mjs ./

RUN corepack enable && yarn install --immutable

COPY . .
RUN yarn build

FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/package.json ./
COPY --from=builder /app/yarn.lock ./
COPY --from=builder /app/.yarn ./.yarn
COPY --from=builder /app/.pnp.cjs ./
COPY --from=builder /app/.pnp.loader.mjs ./
COPY --from=builder /app/dist ./dist

RUN corepack enable && yarn workspaces focus --all --production

EXPOSE 3000

CMD ["node", "dist/main.js"]
