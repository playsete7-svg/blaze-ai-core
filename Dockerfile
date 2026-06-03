FROM node:18

WORKDIR /app

# Copia tudo primeiro para garantir que as pastas src/infra existam
COPY . .

# Instala as dependências ignorando scripts que podem travar
RUN npm install --ignore-scripts

# Instala o sucrase localmente
RUN npm install sucrase

# Comando para rodar
CMD ["npx", "sucrase-node", "integracao_blaze.ts"]

