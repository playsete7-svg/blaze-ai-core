FROM node:18

WORKDIR /app

# Copia os arquivos de configuração
COPY package*.json ./

# Instala apenas o essencial, ignorando erros de scripts secundários
RUN npm install --include=dev --ignore-scripts

# Copia todo o resto do código
COPY . .

# Comando para rodar sua IA
CMD ["npx", "sucrase-node", "integracao_blaze.ts"]
