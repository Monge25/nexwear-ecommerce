import apiClient from '@/config/axiosConfig'
import type { Product, ProductFilters, ProductsResponse } from '@/types'

/** Normalise a single product from various API shapes */
function normaliseProduct(raw: Record<string, unknown>): Product {
  // ── Colors ──────────────────────────────────────────────────────────────────
  const colors = Array.isArray(raw.colors) && (raw.colors as unknown[]).length > 0
    ? (raw.colors as Record<string, string>[]).map((c) => ({
        name: String(c.name ?? c.color ?? 'Color'),
        hex:  String(c.hex  ?? c.value ?? '#888'),
      }))
    : [{ name: 'Negro', hex: '#0a0a0a' }]

  // ── Sizes ────────────────────────────────────────────────────────────────────
  const rawSizes = raw.sizes ?? raw.size
  const sizes = Array.isArray(rawSizes) && rawSizes.length > 0
    ? (rawSizes as string[])
    : typeof rawSizes === 'string' && rawSizes
      ? [rawSizes]          // API devuelve un solo string "M"
      : ['S', 'M', 'L']

  // ── imageUrl — la API devuelve string, no array ────────────────────────────
  const imageUrl = raw.imageUrl
    ? String(raw.imageUrl)
    : raw.image
      ? String(raw.image)
      : ''

  return {
    id:            Number(raw.id ?? raw._id ?? 0),
    name:          String(raw.name ?? raw.title ?? ''),
    slug: String(
      raw.slug ??
      // Si no hay slug, usar el ID como slug — así /productos/42 siempre funciona
      (raw.id ?? raw._id ?? String(raw.name ?? '').toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''))
    ),
    category:      (raw.category as Product['category']) ?? 'mujer',
    price:         Number(raw.price ?? raw.salePrice ?? 0),
    originalPrice: raw.originalPrice != null
      ? Number(raw.originalPrice)
      : raw.comparePrice != null
        ? Number(raw.comparePrice)
        : undefined,
    isNew:         Boolean(raw.isNew ?? raw.is_new ?? false),
    isSale:        Boolean(raw.isSale ?? raw.is_sale ?? raw.onSale ?? false),
    imageUrl,
    colors,
    sizes:         sizes as Product['sizes'],
    material:      String(raw.material ?? raw.fabric ?? ''),
    description:   String(raw.description ?? raw.desc ?? ''),
    rating:        Number(raw.rating ?? raw.averageRating ?? 4.5),
    reviewCount:   Number(raw.reviewCount ?? raw.reviews ?? raw.numReviews ?? 0),
    care:          String(raw.care ?? raw.careInstructions ?? ''),
    origin:        String(raw.origin ?? raw.madeIn ?? ''),
    stock:         Number(raw.stock ?? raw.quantity ?? raw.countInStock ?? 99),
    tags:          Array.isArray(raw.tags) ? (raw.tags as string[]) : [],
  }
}

/** Normalise paginated products response */
function normaliseProductsResponse(raw: unknown): ProductsResponse {
  if (Array.isArray(raw)) {
    const products = (raw as Record<string, unknown>[]).map(normaliseProduct)
    return { data: products, total: products.length, page: 1, totalPages: 1 }
  }
  const r = raw as Record<string, unknown>
  const items = Array.isArray(r.data)     ? r.data
              : Array.isArray(r.products) ? r.products
              : Array.isArray(r.items)    ? r.items
              : []
  return {
    data:       (items as Record<string, unknown>[]).map(normaliseProduct),
    total:      Number(r.total ?? r.count ?? items.length),
    page:       Number(r.page  ?? r.currentPage ?? 1),
    totalPages: Number(r.totalPages ?? r.pages ?? Math.ceil(Number(r.total ?? items.length) / 12)),
  }
}

const productService = {
  async getProducts(filters: ProductFilters = {}): Promise<ProductsResponse> {
    // FIX: /Products con P mayúscula
    const { data } = await apiClient.get('/Products', { params: filters })
    return normaliseProductsResponse(data)
  },

  async getProductBySlug(slug: string): Promise<Product> {
    // Estrategia 1: si es un ID numérico → GET /Products/{id} directo
    if (/^\d+$/.test(slug)) {
      try {
        const { data } = await apiClient.get(`/Products/${slug}`)
        const raw = (data?.product ?? data?.data ?? data) as Record<string, unknown>
        if (raw?.id) return normaliseProduct(raw)
      } catch { /* continuar */ }
    }

    // Estrategia 2: GET /Products/{slug} (por si la API soporta slug)
    try {
      const { data } = await apiClient.get(`/Products/${slug}`)
      const raw = (data?.product ?? data?.data ?? data) as Record<string, unknown>
      if (raw?.id && raw?.name) return normaliseProduct(raw)
    } catch { /* continuar */ }

    // Estrategia 3: traer todos y filtrar localmente por slug o nombre
    try {
      const { data } = await apiClient.get('/Products', { params: { limit: 200 } })
      const all = normaliseProductsResponse(data).data
      const match = all.find(p =>
        p.slug === slug ||
        p.id === Number(slug) ||
        p.name.toLowerCase().replace(/\s+/g, '-') === slug
      )
      if (match) return match
    } catch { /* continuar */ }

    throw new Error('Producto no encontrado')
  },

  async getFeatured(): Promise<Product[]> {
    try {
      const { data } = await apiClient.get('/Products/featured')
      if (Array.isArray(data)) return (data as Record<string, unknown>[]).map(normaliseProduct)
      return normaliseProductsResponse(data).data
    } catch {
      // Fallback: productos más recientes
      const { data } = await apiClient.get('/Products', { params: { limit: 8, sortBy: 'newest' } })
      return normaliseProductsResponse(data).data
    }
  },

  async search(query: string): Promise<Product[]> {
    try {
      const { data } = await apiClient.get('/Products/search', { params: { q: query } })
      if (Array.isArray(data)) return (data as Record<string, unknown>[]).map(normaliseProduct)
      return normaliseProductsResponse(data).data
    } catch {
      const { data } = await apiClient.get('/Products', { params: { search: query } })
      return normaliseProductsResponse(data).data
    }
  },

  async getRelated(productId: number): Promise<Product[]> {
    try {
      const { data } = await apiClient.get(`/Products/${productId}/related`)
      if (Array.isArray(data)) return (data as Record<string, unknown>[]).map(normaliseProduct)
      return normaliseProductsResponse(data).data
    } catch {
      const { data } = await apiClient.get('/Products', { params: { limit: 5 } })
      return normaliseProductsResponse(data).data
        .filter((p) => p.id !== productId)
        .slice(0, 4)
    }
  },
}

export default productService