import apiClient from '@/config/axiosConfig'
import type { Product, ProductFilters, ProductsResponse } from '@/types'
import type { ProductVariant } from '@/types'

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
      ? [rawSizes]
      : ['S', 'M', 'L']

  // ── imageUrl ─────────────────────────────────────────────────────────────────
  const imageUrl = raw.imageUrl
    ? String(raw.imageUrl)
    : raw.image
      ? String(raw.image)
      : ''

  // ── id como string (UUID) ────────────────────────────────────────────────────
  const id = String(raw.id ?? raw._id ?? '')

  return {
    id,
    name:          String(raw.name ?? raw.title ?? ''),
    slug: String(
      raw.slug ??
      id ??
      String(raw.name ?? '').toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
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
    isActive:      Boolean(raw.isActive ?? raw.active ?? true),
    variants:      Array.isArray(raw.variants) ? (raw.variants as ProductVariant[]) : [],
  }
}

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
    const { data } = await apiClient.get('/Products', { params: filters })
    return normaliseProductsResponse(data)
  },

  async getProductBySlug(slug: string): Promise<Product> {
    try {
      const { data } = await apiClient.get(`/Products/${slug}`)
      const raw = (data?.product ?? data?.data ?? data) as Record<string, unknown>
      if (raw?.id && raw?.name) return normaliseProduct(raw)
    } catch { /* continuar */ }

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

  // ── getRelated: endpoint dedicado + fallback filtrado por categoría ──
  async getRelated(productId: string, category?: string): Promise<Product[]> {
    // 1. Intentar endpoint dedicado /related
    try {
      const { data } = await apiClient.get(`/Products/${productId}/related`)
      const products = Array.isArray(data)
        ? (data as Record<string, unknown>[]).map(normaliseProduct)
        : normaliseProductsResponse(data).data

      if (category) {
        const filtered = products.filter((p) => p.category === category)
        return filtered.length >= 2 ? filtered.slice(0, 4) : products.slice(0, 4)
      }
      return products.slice(0, 4)
    } catch { /* fallback */ }

    // 2. Fallback: traer un lote amplio y filtrar por categoría en cliente
    try {
      const { data } = await apiClient.get('/Products', {
        params: { limit: 20, category },   // enviar category al backend también
      })
      const all = normaliseProductsResponse(data).data
        .filter((p) => p.id !== productId)

      if (category) {
        const byCat = all.filter((p) => p.category === category)
        if (byCat.length >= 2) return byCat.slice(0, 4)
      }

      return all.slice(0, 4)
    } catch {
      return []
    }
  },

  // ── Variantes — productId como string (UUID) ──────────────────────────────────
  async getVariants(productId: string): Promise<ProductVariant[]> {
    try {
      const { data } = await apiClient.get(`/Products/${productId}/variants`)
      const list: unknown[] = Array.isArray(data)          ? data
                            : Array.isArray(data?.data)     ? data.data
                            : Array.isArray(data?.variants) ? data.variants
                            : []
      return list as ProductVariant[]
    } catch (e) {
      console.warn('[Variants] failed for product', productId, e)
      return []
    }
  },
}

export default productService