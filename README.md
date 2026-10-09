# UniMarket CUNOC — PoC multi-nube (Práctica 4, SA)

PoC del microservicio "productos" de UniMarket CUNOC (caso de estudio definido en la Práctica 3)
para la comparativa de proveedores de nube con PoC (`practica_4_final.md`), desplegado en AWS,
GCP, Azure y OCI

## Estructura

```
backend/    API REST (Node.js + Express) — GET /health, POST/GET /products
frontend/   UI mínima (Vue 3 + Vite), apunta a la API via runtime config (config.js)
deploy/     Instrucciones + plantillas de despliegue por proveedor (aws, gcp, azure, oci)
docs/       Bitácora empírica para la sección 4.3.2 del enunciado
docker-compose.yml   Entorno local (Postgres + backend + frontend) para probar antes de subir a la nube
```

## Correr localmente (antes de tocar cualquier nube)

```bash
docker compose up --build
```
- Backend: http://localhost:8080/health
- Frontend: http://localhost:5173

Esto valida el modelo de datos y la API con Postgres local antes de gastar tiempo en cuentas de
nube — el mismo código (`DB_DRIVER=postgres`) se reutiliza tal cual para AWS/GCP/Azure.

## Correr sin Docker (desarrollo rápido, sin BD)

```bash
cd backend
cp .env.example .env    # dejar DB_DRIVER=memory
npm install
npm run dev
```