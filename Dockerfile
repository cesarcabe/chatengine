FROM node:20-alpine

WORKDIR /app

# Copia dependências
COPY package.json package-lock.json ./
RUN npm ci

# Copia código
COPY . .

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Roda o servidor (Next API routes funcionam)
CMD ["npm", "run", "start"]