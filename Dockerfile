FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY src ./src
COPY config.example.yml ./config.example.yml
EXPOSE 8080
CMD ["node", "src/server.mjs"]
