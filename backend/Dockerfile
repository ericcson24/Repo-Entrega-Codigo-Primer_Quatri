FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Cloud Run sets PORT variable (usually 8080).
# Expose default 8080
EXPOSE 8080

CMD ["npm", "start"]
