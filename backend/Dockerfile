FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Cloud Run establece la variable PORT (usualmente 8080).
# Exponer puerto predeterminado 8080
EXPOSE 8080

CMD ["npm", "start"]
