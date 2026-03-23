import apiClient from '@/config/axiosConfig'
import type { Product, ProductFilters, ProductsResponse, ProductVariant } from '@/types'

/** Normalise a single product from various API shapes */
function normaliseProduct(raw: Record<string, unknown>): Product {
  return {
    id:            String(raw.id ?? ''),
    name:          String(raw.name ?? ''),
    slug:          String(raw.slug ?? String(raw.name ?? '').toLowerCase().replace(/\s+/g, '-')),
    category:      (raw.category as Product['category']) ?? 'mujer',
    price:         Number(raw.price ?? raw.basePrice ?? 0),
    originalPrice: raw.originalPrice != null ? Number(raw.originalPrice) : undefined,
    isNew:         Boolean(raw.isNew ?? false),
    isSale:        Boolean(raw.isSale ?? false),
    imageUrl:      raw.imageUrl ? String(raw.imageUrl) : '',
    material:      String(raw.material ?? ''),
    description:   String(raw.description ?? ''),
    rating:        Number(raw.rating ?? 4.5),
    reviewCount:   Number(raw.reviewCount ?? 0),
    care:          String(raw.care ?? ''),
    origin:        String(raw.origin ?? ''),
    //stock:         0,  // ya no viene directo, se calcula de variantes
    tags:          Array.isArray(raw.tags) ? (raw.tags as string[]) : [],
    isActive:      Boolean(raw.isActive ?? true),
    createdAt:     raw.createdAt ? String(raw.createdAt) : undefined,
    variants:      Array.isArray(raw.variants)
      ? (raw.variants as Record<string, unknown>[]).map(normaliseVariant)
      : [],
  }
}

function normaliseVariant(raw: Record<string, unknown>): ProductVariant {
  return {
    id:            String(raw.id ?? ''),
    color:         raw.color ? String(raw.color) : undefined,
    colorHex:      raw.colorHex ? String(raw.colorHex) : undefined,
    size:          raw.size ? String(raw.size) : undefined,
    priceModifier: Number(raw.priceModifier ?? 0),
    finalPrice:    Number(raw.finalPrice ?? raw.price ?? 0),
    stock:         Number(raw.stock ?? 0),
    imageUrl:      raw.imageUrl ? String(raw.imageUrl) : undefined,
    isActive:      Boolean(raw.isActive ?? true),
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
        p.id === slug ||
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

  async getRelated(productId: string): Promise<Product[]> {
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