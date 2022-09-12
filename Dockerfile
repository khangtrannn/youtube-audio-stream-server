FROM node:lts-alpine3.12

RUN apk update && apk add ffmpeg && rm -rf /var/cache/apk/*

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 8080
CMD [ "node", "server.js" ]