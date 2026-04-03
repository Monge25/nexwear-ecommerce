export const FREE_SHIPPING_THRESHOLD = 150

export const CATEGORIES = [
  { value: 'mujer',      label: 'Mujer' },
  { value: 'hombre',     label: 'Hombre' },
  { value: 'exteriores', label: 'Exteriores' },
  { value: 'accesorios', label: 'Accesorios' },
] as const

export const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'] as const

export const SORT_OPTIONS = [
  // { value: 'relevance',  label: 'Relevancia' },
  { value: 'price_asc',  label: 'Precio: menor' },
  { value: 'price_desc', label: 'Precio: mayor' },
  { value: 'createdAt_asc',     label: 'Más recientes' },
  { value: 'createdAt_desc',     label: 'Menos recientes' },
] as const

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending:    'Pendiente',
  confirmed:  'Confirmado',
  processing: 'Procesando',
  shipped:    'Enviado',
  delivered:  'Entregado',
  cancelled:  'Cancelado',
}

export const ROUTES = {
  HOME:           '/',
  PRODUCTS:       '/productos',
  PRODUCT_DETAIL: '/productos/:slug',
  CART:           '/carrito',
  CHECKOUT:       '/checkout',
  LOGIN:          '/auth/login',
  REGISTER:       '/auth/registro',
  PROFILE:        '/perfil',
  ORDERS:         '/perfil/pedidos',
  NOT_FOUND:      '*',
} as const
