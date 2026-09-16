# Bóveda Frontend — Aplicación Web

Frontend web para el sistema **Bóveda híbrida de archivos cifrados para equipos académicos y pequeñas organizaciones**, construido con **React**, **Vite**, **Axios** y **React Router**.

---

## 1. Requisitos Previos

- [Node.js](https://nodejs.org/) (versión 18+ o LTS recomendada)
- [npm](https://www.npmjs.com/) (versión 9+)
- Backend de FastAPI levantado en `http://localhost:8000`

---

## 2. Instalación de Dependencias

```bash
npm install
```

---

## 3. Variables de Entorno

Copia el archivo de ejemplo para configurar la URL del backend:

```bash
cp .env.example .env
```

Contenido de `.env`:

```env
VITE_API_URL=http://localhost:8000/api/v1
```

---

## 4. Ejecución en Modo Desarrollo

```bash
npm run dev
```

La aplicación estará disponible por defecto en:
👉 [http://localhost:5173](http://localhost:5173)

---

## 5. Compilación para Producción

```bash
npm run build
```

Los archivos estáticos optimizados se generarán dentro de la carpeta `dist/`.

---

## 6. Estructura del Proyecto

```text
boveda-frontend/
│
├── src/
│   ├── api/
│   │   └── axios.js
│   ├── components/
│   ├── pages/
│   │   └── HomePage.jsx
│   ├── routes/
│   │   └── AppRoutes.jsx
│   ├── services/
│   │   └── healthService.js
│   ├── App.jsx
│   ├── index.css
│   └── main.jsx
│
├── .env.example
├── .gitignore
├── index.html
├── package.json
├── vite.config.js
└── README.md
```
