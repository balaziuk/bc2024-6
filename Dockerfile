# Dockerfile
ARG NODE_VERSION=23.1.0

FROM node:${NODE_VERSION}-alpine

ENV NODE_ENV production

WORKDIR /usr/src/app

RUN --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=package-lock.json,target=package-lock.json \
    --mount=type=cache,target=/root/.npm \
    npm ci

RUN npm install --save-dev nodemon

COPY package.json package-lock.json ./

USER node

COPY . .

EXPOSE 8081 9229

CMD ["npx", "nodemon","--inspect=0.0.0.0:9229", "server.js", "--", "-h", "0.0.0.0", "-p", "8008", "-c", "./cache"]
