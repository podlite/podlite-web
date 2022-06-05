# Install dependencies only when needed
FROM node:17-alpine AS builder
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk update && apk add  --no-cache libc6-compat tzdata bash

WORKDIR /app
COPY . .
RUN yarn install 
ENV NEXT_TELEMETRY_DISABLED 1

EXPOSE 3000
ENV PORT 3000

COPY ./bin/entrypoint.sh /entrypoint.sh
ENTRYPOINT ["/bin/bash", "--login", "/entrypoint.sh"]
