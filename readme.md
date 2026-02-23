# 📊 App de Finanzas PyME

Sistema web interno para el registro y gestión de ingresos y egresos. Creado con un enfoque pragmático, cero ORMs pesados y mínimas dependencias.

## 🧱 Stack Tecnológico
* **Frontend:** React + Vite + TailwindCSS (v3) + React Router.
* **Backend:** Node.js + Express + JWT + SQLite (Dev) / PostgreSQL (Prod).

## 🚀 Requisitos Previos
* Node.js v18 o superior.
* NPM o Yarn.

## 📦 Instalación y Configuración

### 1. Backend
Navega a la carpeta del servidor e instala dependencias:
\`\`\`bash
cd backend
npm install
\`\`\`

Configura las variables de entorno. Crea un archivo \`.env\` en \`backend/\`:
\`\`\`env
PORT=3000
NODE_ENV=development
JWT_SECRET=tu-secreto-super-seguro
\`\`\`

Inicializa la base de datos y crea el usuario administrador:
\`\`\`bash
node scripts/init-db.js
node scripts/reset-admin.js
\`\`\`

Arranca el servidor en modo desarrollo:
\`\`\`bash
npm run dev
\`\`\`

### 2. Frontend
En una nueva terminal, navega a la carpeta del cliente:
\`\`\`bash
cd frontend
npm install
\`\`\`

Arranca el entorno de desarrollo:
\`\`\`bash
npm run dev
\`\`\`

La aplicación estará disponible en \`http://localhost:5173\`.


## 🧪 Testing
* **Backend:** Con el servidor corriendo, ejecuta \`node --test tests/api.test.js\` dentro de la carpeta \`backend\`.
* **Frontend:** Ejecuta \`npm run test\` dentro de la carpeta \`frontend\`.