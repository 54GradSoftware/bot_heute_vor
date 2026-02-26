FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci && npm install --save-exact tsx

COPY heute-vor.ts locations.ts highlight-repost.ts tsconfig.json ./

CMD ["tail", "-f", "/dev/null"]
