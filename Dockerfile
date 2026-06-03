FROM node:18

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Instalando o sucrase globalmente para rodar o script TS
RUN npm install -g sucrase

# O Render precisa de uma porta aberta mesmo para serviços de log, mas aqui vamos focar no script de integração
CMD ["sucrase-node", "integracao_blaze.ts"]
