###############################################################################
# Step 1 : Builder image (all packages, compiles TypeScript to dist/)
#
FROM node:22-alpine AS builder

WORKDIR /home/node/app
COPY . .
RUN yarn install --frozen-lockfile && yarn run build

###############################################################################
# Step 2 : Run image (production packages and compiled code only)
#
FROM node:22-alpine

ARG PORT

ENV NODE_ENV production
WORKDIR /home/node/app

COPY --from=builder /home/node/app/package.json /home/node/app/yarn.lock ./
RUN yarn install --production --frozen-lockfile && yarn cache clean
COPY --from=builder /home/node/app/dist ./dist

EXPOSE ${PORT}

# Settings and secrets (MYSQL_*, AI_API_KEY, ...) are passed in at runtime, never built into the image.
# Update the tables and default data, then start the API
CMD ["sh", "-c", "yarn db:migrate:prod && yarn db:seed:prod && yarn start"]
