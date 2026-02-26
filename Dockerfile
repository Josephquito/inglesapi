FROM node:18-alpine

WORKDIR /app

# Instalar dependencias para node-gyp si es necesario
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "start"]