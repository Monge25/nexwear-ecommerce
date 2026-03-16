# Nexwear — React + TypeScript Frontend

Ecommerce de moda premium construido con **React 18 + TypeScript + Vite**.

## 🚀 Inicio rápido

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env
# Edita .env con tu URL de API

# 3. Iniciar servidor de desarrollo
npm run dev
# → http://localhost:3000
```

## 📁 Estructura del proyecto

```
src/
├── assets/               # Imágenes, íconos, fuentes
├── components/
│   ├── ui/               # Button, Input, Modal, Loader
│   ├── layout/           # Navbar, Footer, Sidebar (cart), Container
│   └── common/           # ProductCard, Rating, Price
├── pages/
│   ├── Home/             # Landing page con hero, destacados, categorías
│   ├── Products/         # Listado con filtros + detalle de producto
│   ├── Cart/             # Página de carrito
│   ├── Checkout/         # Flujo 3 pasos: envío → pago → revisión
│   ├── Auth/             # Login + Registro
│   └── Profile/          # Pedidos, direcciones, configuración
├── services/             # productService, authService, cartService, orderService
├── context/              # AuthContext, CartContext (Context API)
├── hooks/                # useAuth, useCart, useFetch
├── routes/               # AppRouter, PrivateRoute
├── utils/                # formatPrice, validators, constants
├── types/                # TypeScript types compartidos
└── config/               # axiosConfig (interceptors JWT), environment
```

## 🔌 Conectar a tu API

Edita `.env`:
```
VITE_API_BASE_URL=https://tu-api.com/v1
```

### Endpoints esperados

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET    | /products | Listado con filtros (query params) |
| GET    | /products/:slug | Detalle de producto |
| GET    | /products/featured | Productos destacados |
| GET    | /products/search?q= | Búsqueda |
| GET    | /products/:id/related | Productos relacionados |
| POST   | /auth/login | Login → devuelve { user, token, refreshToken } |
| POST   | /auth/register | Registro |
| POST   | /auth/logout | Logout |
| GET    | /auth/me | Usuario actual |
| GET    | /cart | Carrito del usuario |
| POST   | /cart/items | Añadir al carrito |
| PUT    | /cart/items/:id | Actualizar cantidad |
| DELETE | /cart/items/:id | Eliminar item |
| POST   | /orders | Crear pedido |
| GET    | /orders | Historial de pedidos |

## 🛠 Scripts

```bash
npm run dev      # Desarrollo (localhost:3000)
npm run build    # Build de producción
npm run preview  # Preview del build
npm run lint     # Linting TypeScript
```

## 🎨 Tecnologías

- **React 18** + **TypeScript**
- **Vite 5** — bundler ultrarrápido
- **React Router v6** — rutas con lazy loading
- **Axios** — cliente HTTP con interceptores JWT
- **Context API** — estado global (auth + carrito)
- **CSS Modules** — estilos encapsulados por componente
- **Playfair Display + DM Sans** — tipografía de lujo

## 📐 Decisiones de diseño

- Los **filtros** viven en URL params (`/productos?category=mujer&sort=price_asc`) → compartible y con back button funcional
- El **carrito** se gestiona localmente (Context) y se puede sincronizar con la API en `cartService`
- El **token** se renueva automáticamente con el interceptor de Axios (refresh token)
- Todas las páginas se cargan con **lazy loading** para mejorar el tiempo de carga inicial
