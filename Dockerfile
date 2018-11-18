FROM node:alpine

RUN npm i -g nodemon

WORKDIR app

COPY package*.json ./
RUN npm install
COPY . .

ENV NODE_ENV production
ENV PORT 3000

EXPOSE 3000

CMD ["node", "index.js"]