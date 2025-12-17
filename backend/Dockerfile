FROM node:18.10.0 AS base

ENV DIR=/app
# DIRECTORIO DE TRABAJO
WORKDIR ${DIR}

FROM base AS dev

ENV NODE_ENV=local
# DEPENDENCIAS
COPY package*.json  ${DIR}

# Instala las dependencias de npm (se instalarán las dependencias definidas en package.json)
RUN npm install

# Elimina el directorio node_modules para asegurarte de que se reinstala todo de cero
RUN rm -rf node_modules

# Limpia el caché de npm para evitar problemas con dependencias corruptas
RUN npm cache clean --force
# Instala las dependencias del sistema (build-essential)
RUN apt-get update && apt-get install -y build-essential
# Reinstala las dependencias y reconstruye los módulos nativos de mejor-sqlite3
RUN npm install && npm rebuild better-sqlite3


# CÓDIGO
COPY tsconfig*.json ${DIR}
COPY src ${DIR}/src
COPY files ${DIR}/files

EXPOSE ${PORT}

CMD ["npm", "run", "dev" ]


# Imagen de Build para producción
FROM base AS build

ARG PORT=5000 EHILUCS_HOST JWT_SECRET \
    GEOSERVER_HOST USERNAME_GEOSERVER PASS_GEOSERVER \
    AWS_REGION \
    AWS_SES_ACCESS_KEY_ID AWS_SES_SECRET_ACCESS_KEY AWS_SES_EMAIL \
    AWS_S3_ACCESS_KEY_ID AWS_S3_SECRET_ACCESS_KEY \
    POSTGRESQL_HOST USERNAME_POSTGRESQL PASS_POSTGRESQL \
    PORT_POSTGRESQL DATABASE ADMIN_USER ADMIN_PASS


ENV PORT="$PORT" EHILUCS_HOST="$EHILUCS_HOST" \
    JWT_SECRET="$JWT_SECRET" \
    GEOSERVER_HOST="$GEOSERVER_HOST" \
    USERNAME_GEOSERVER="$USERNAME_GEOSERVER" \
    PASS_GEOSERVER="$PASS_GEOSERVER" \
    AWS_REGION="$AWS_REGION" \
    AWS_SES_ACCESS_KEY_ID="$AWS_SES_ACCESS_KEY_ID" \
    AWS_SES_SECRET_ACCESS_KEY="$AWS_SES_SECRET_ACCESS_KEY" \
    AWS_SES_EMAIL="$AWS_SES_EMAIL" \
    AWS_S3_ACCESS_KEY_ID="$AWS_S3_ACCESS_KEY_ID" \
    AWS_S3_SECRET_ACCESS_KEY="$AWS_S3_SECRET_ACCESS_KEY" \
    POSTGRESQL_HOST="$POSTGRESQL_HOST" \
    USERNAME_POSTGRESQL="$USERNAME_POSTGRESQL" \
    PASS_POSTGRESQL="$PASS_POSTGRESQL" \
    PORT_POSTGRESQL="$PORT_POSTGRESQL" \
    DATABASE="$DATABASE" \
    ADMIN_USER="$ADMIN_USER" \
    ADMIN_PASS="$ADMIN_PASS" 
# RUN apt-get update && apt-get add --no-cache dumb-init=1.2.5-r3 && npm install -g pnpm@9.14.2

COPY package*.json  ${DIR}

RUN npm ci

COPY tsconfig*.json ${DIR}
COPY src ${DIR}/src
COPY files ${DIR}/files


RUN npm run build && \
    npm prune --production


# Imagen de producción
FROM base AS production

ARG PORT=5000 EHILUCS_HOST JWT_SECRET \
    GEOSERVER_HOST USERNAME_GEOSERVER PASS_GEOSERVER \
    AWS_REGION \
    AWS_SES_ACCESS_KEY_ID AWS_SES_SECRET_ACCESS_KEY AWS_SES_EMAIL \
    AWS_S3_ACCESS_KEY_ID AWS_S3_SECRET_ACCESS_KEY \
    POSTGRESQL_HOST USERNAME_POSTGRESQL PASS_POSTGRESQL \
    PORT_POSTGRESQL DATABASE ADMIN_USER ADMIN_PASS


ENV PORT="$PORT" EHILUCS_HOST="$EHILUCS_HOST" \
    JWT_SECRET="$JWT_SECRET" \
    GEOSERVER_HOST="$GEOSERVER_HOST" \
    USERNAME_GEOSERVER="$USERNAME_GEOSERVER" \
    PASS_GEOSERVER="$PASS_GEOSERVER" \
    AWS_REGION="$AWS_REGION" \
    AWS_SES_ACCESS_KEY_ID="$AWS_SES_ACCESS_KEY_ID" \
    AWS_SES_SECRET_ACCESS_KEY="$AWS_SES_SECRET_ACCESS_KEY" \
    AWS_SES_EMAIL="$AWS_SES_EMAIL" \
    AWS_S3_ACCESS_KEY_ID="$AWS_S3_ACCESS_KEY_ID" \
    AWS_S3_SECRET_ACCESS_KEY="$AWS_S3_SECRET_ACCESS_KEY" \
    POSTGRESQL_HOST="$POSTGRESQL_HOST" \
    USERNAME_POSTGRESQL="$USERNAME_POSTGRESQL" \
    PASS_POSTGRESQL="$PASS_POSTGRESQL" \
    PORT_POSTGRESQL="$PORT_POSTGRESQL" \
    DATABASE="$DATABASE" \
    ADMIN_USER="$ADMIN_USER" \
    ADMIN_PASS="$ADMIN_PASS" 

ENV USER node

# COPY --from=build /usr/bin/dumb-init /usr/bin/dumb-init
COPY --from=build ${DIR}/dist ${DIR}/dist
COPY --from=build ${DIR}/node_modules ${DIR}/node_modules
COPY --from=build ${DIR}/files ${DIR}/files

ENV NODE_ENV=production
EXPOSE $PORT

USER ${USER}

# CMD ["dumb-init","node", "dist/index.js"]
CMD ["node", "dist/index.js"]
