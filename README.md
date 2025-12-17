# Conservation, Land-Sea Interactions & Ecosystem Services - Version 1.0.0
This project is implemented for the Input Data Module Tools of the ReMAP Project.
It is developed by [Luz Marina Pulido Santiago](https://github.com/lm106). 
# ReMAP — Input Data Module Tools

Este proyecto implementa las herramientas del Módulo de Datos de Entrada (Input Data Module) del proyecto ReMAP.

Desarrollado por: 

---

## Stack Tecnológico

- **Front-end:** Vite + Vue.js 3
- **Back-end:** Node.js (Express) + TypeScript

### Front-end

- **Core:**
  - `vue`: ^3.4.29
  - `vue-router`: ^4.3.3
  - `pinia`: ^2.1.7
  - `vite`: ^5.3.1

- **Mapas y Geoprocesamiento:**
  - `ol` (OpenLayers): ^10.3.0
  - `@turf/turf` y utilidades: ^7.2.0

- **HTTP y utilidades:**
  - `axios`: ^1.7.9

- **UI / Estilos (dev/devDeps):**
  - `vuetify`: ^3.7.4
  - `@mdi/font`, `@mdi/js`

- **Testing & Tools:**
  - `vitest`, `cypress`

### Back-end

- **Core:**
  - `node` + `express`: ^4.21.2
  - `typescript`: ^5.7.2 (dev)
  - `nodemon` / `ts-node-dev` (dev)

- **Bases de datos y almacenamiento:**
  - `pg` (Postgres client): ^8.14.1
  - `better-sqlite3` (uso puntual): ^11.8.1
  - AWS S3 / SES clients: `@aws-sdk/*`

- **Archivos y utilidades:**
  - `multer`, `xlsx`, `xml2js`, `stream-json`
  - `dotenv`, `cors`, `axios`

- **Correo y notificaciones:**
  - `nodemailer`

---

## Instalación y ejecución

> Nota: los comandos están pensados para Windows (PowerShell / CMD). Ajusta si usas Linux/macOS.

### Front-end

#### Preparación

```sh
cd frontend
npm install
```

#### Desarrollo

- Ejecutar en modo desarrollo (configurado en `package.json`):

```sh
npm run start:win   # inicia Vite en modo development
# o
npm run start       # usa el modo dev-local definido en el proyecto
```

#### Build de producción

```sh
npm run build
```

#### Previsualizar producción

```sh
npm run preview
```

#### Tests

- Unitarios (Vitest):

```sh
npm run test:unit
```

- End-to-End (Cypress):

```sh
npm run test:e2e
```

---

### Back-end

#### Preparación

```sh
cd backend
npm install
```

#### Desarrollo

- En Windows (scripts disponibles):

```sh
npm run dev:win    # set NODE_ENV=development && nodemon ./src/index.ts
# o
npm run dev        # set NODE_ENV=local && nodemon ./src/index.ts
```

#### Compilar (TypeScript)

```sh
npm run build
```

#### Notas de ejecución en producción

- El build produce archivos TypeScript compilados (según `tsconfig.json`) que se deben ejecutar con Node.

---

## Variables de entorno

- Front-end: existe `frontend/.env.dev-local` usado por el proyecto para desarrollo local.
- Back-end: hay archivos de entorno en la carpeta `backend` (`.env.local` y `.env.development` en el repo). Configura las variables necesarias para conexión a base de datos, credenciales AWS, y correo.

Comprueba y crea tus archivos `.env` según tu entorno.

---

## Requisitos recomendados

- Node.js v18.x (se recomienda `v18.20.3` por compatibilidad con dependencias usadas).
- npm >= 9 (o pnpm/yarn si prefieres, pero los scripts están probados con `npm`).

---

## Estructura importante del repositorio

- Frontend: [frontend](frontend)
- Backend: [backend](backend)
- Scripts auxiliares: [script_python/split_geojson.py](script_python/split_geojson.py)
