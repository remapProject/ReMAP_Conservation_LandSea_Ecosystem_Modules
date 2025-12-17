FROM node:18.10.0-alpine AS base

ENV DIR=/app
# DIRECTORIO DE TRABAJO
WORKDIR ${DIR}

FROM base AS dev

ENV NODE_ENV=local

# DEPENDENCIAS
COPY package*.json ${DIR}

RUN npm install

# CÓDIGO
COPY . .

EXPOSE ${PORT}

CMD ["npm", "run", "start", "--", "--host", "0.0.0.0" ]

# Imagen de Build para producción
FROM base AS build 

COPY package*.json ${DIR}

RUN npm ci

COPY . .

RUN npm run build && \ 
    npm prune --production

# Imagen de producción
FROM base AS production

ENV USER node
COPY --from=build ${DIR}/dist ${DIR}/dist
COPY --from=build ${DIR}/node_modules ${DIR}/node_modules
ENV NODE_ENV=production
