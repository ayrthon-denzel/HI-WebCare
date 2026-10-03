FROM mcr.microsoft.com/playwright:v1.56.1-noble
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .
ENV NODE_ENV=production PORT=10000
EXPOSE 10000
CMD ["npm","start"]
