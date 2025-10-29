# Seminario Analista — Backend (DEMO)

API mínima para demo (sin autenticación real).

Stack: **Node.js + Express + TypeScript**, **Prisma**, **PostgreSQL** (usando Docker para la base de datos local).

---

## 🚀 Requisitos previos

* **Node.js** v20+ y **npm**
* **Docker Desktop** (recomendado para la base de datos)

  * En Windows: tener **Docker Desktop + WSL2** activado
* (Opcional) **Postman o Insomnia** para probar endpoints

---

## ⚙️ Primer uso — Paso a paso

### 1️⃣ Clonar el repositorio

```bash
git clone <URL-DEL-REPO> seminario_analista_back
cd seminario_analista_back
```

### 2️⃣ Instalar dependencias

```bash
npm install
```

### 3️⃣ Crear archivo `.env`

Copiar el ejemplo incluido:

```bash
cp .env.example .env
```

Contenido por defecto:

```
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://app:app@localhost:5432/app?schema=public
```

### 4️⃣ Levantar la base de datos (Docker)

> Asegurate de tener **Docker Desktop abierto** antes de ejecutar:

```bash
npm run db:up
```

### 5️⃣ Generar cliente Prisma y aplicar migraciones

```bash
npm run prisma:generate
npm run prisma:migrate
```

### 6️⃣ Cargar datos de ejemplo (seed)

```bash
npm run db:seed
```

### 7️⃣ Levantar la API en modo desarrollo

```bash
npm run dev
```

API disponible en: [http://localhost:3000](http://localhost:3000)

---

## 🔌 Endpoints disponibles

### 🩺 Healthcheck

```http
GET /health
```

Respuesta:

```json
{ "ok": true }
```

### 👥 Usuarios (hardcodeados)

```http
GET /users
```

### 🍽️ Restaurantes

```http
GET /restaurants
```

Parámetros opcionales:

```
?cuisines=Japonesa&maxPrice=30
```

### 📅 Crear reserva

```http
POST /reservations
Content-Type: application/json
```

Body ejemplo:

```json
{
  "restaurantId": "<ID_DE_UN_RESTAURANTE>",
  "date": "2025-10-28T00:00:00.000Z",
  "slot": "20:00",
  "partySize": 2
}
```

---

## 🗂️ Estructura del proyecto

```
seminario_analista_back/
├── src/
│   ├── index.ts          # App principal Express
│   └── data/
│       └── users.ts      # Usuarios hardcodeados
├── prisma/
│   ├── schema.prisma     # Modelos Prisma
│   └── seed.ts           # Datos de ejemplo
├── docker-compose.yml    # Base de datos local
├── package.json
└── tsconfig.json
```

---

## 📜 Scripts principales

```json
"scripts": {
  "dev": "ts-node-dev --respawn --transpile-only src/index.ts",
  "build": "tsc",
  "start": "node dist/index.js",
  "db:up": "docker compose up -d db",
  "db:down": "docker compose down",
  "prisma:generate": "prisma generate",
  "prisma:migrate": "prisma migrate dev --name init",
  "db:seed": "ts-node prisma/seed.ts"
}
```

---

## 🧰 Problemas comunes

### ❌ Docker no levanta o error WSL

* Abrir **Docker Desktop** y asegurarse que esté en ejecución.
* En PowerShell:

  ```bash
  wsl --status
  docker version
  ```
* Si no funciona, instalar PostgreSQL manualmente y usar la misma `DATABASE_URL`.

### ❌ Puerto 5432 ocupado

Cambiar el puerto en `docker-compose.yml` y en `.env` (por ejemplo, 5433).

### ❌ Error de migración Prisma

Asegurarse que la base esté arriba (`npm run db:up`) y volver a ejecutar:

```bash
npm run prisma:generate && npm run prisma:migrate
```

---

## 🔒 Nota sobre seguridad

Esta demo **no incluye autenticación ni autorización**.
En producción se deberán agregar JWT, control de roles, validaciones avanzadas y buenas prácticas de seguridad.

---

**Autores:** Equipo de Seminario Analista 2025 🎓
