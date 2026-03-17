import apiClient from '@/config/axiosConfig'
import type { Product, ProductFilters, ProductsResponse } from '@/types'

/** Normalise a single product from various API shapes */
function normaliseProduct(raw: Record<string, unknown>): Product {
  const colors = Array.isArray(raw.colors)
    ? (raw.colors as Record<string, string>[]).map((c) => ({
        name: String(c.name ?? c.color ?? 'Color'),
        hex:  String(c.hex  ?? c.value ?? '#888'),
      }))
    : [{ name: 'Negro', hex: '#0a0a0a' }]

  const sizes = Array.isArray(raw.sizes)
    ? (raw.sizes as string[])
    : ['S', 'M', 'L']

  return {
    id:            Number(raw.id ?? raw._id ?? 0),
    name:          String(raw.name ?? raw.title ?? ''),
    slug:          String(raw.slug ?? String(raw.name ?? '').toLowerCase().replace(/\s+/g, '-')),
    category:      (raw.category as Product['category']) ?? 'mujer',
    price:         Number(raw.price ?? raw.salePrice ?? 0),
    originalPrice: raw.originalPrice != null ? Number(raw.originalPrice) : raw.comparePrice != null ? Number(raw.comparePrice) : undefined,
    isNew:         Boolean(raw.isNew ?? raw.is_new ?? false),
    isSale:        Boolean(raw.isSale ?? raw.is_sale ?? raw.onSale ?? false),
    imageUrl:        raw.imageUrl ? String(raw.imageUrl) :  '',
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
    const { data } = await apiClient.get('/products', { params: filters })
    return normaliseProductsResponse(data)
  },

  async getProductBySlug(slug: string): Promise<Product> {
    try {
      const { data } = await apiClient.get(`/products/${slug}`)
      const raw = (data?.product ?? data?.data ?? data) as Record<string, unknown>
      return normaliseProduct(raw)
    } catch {
      // Try by ID if slug fails
      const { data } = await apiClient.get(`/products`, { params: { slug } })
      const r = normaliseProductsResponse(data)
      if (!r.data.length) throw new Error('Producto no encontrado')
      return r.data[0]
    }
  },

  async getFeatured(): Promise<Product[]> {
    try {
      const { data } = await apiClient.get('/products/featured')
      if (Array.isArray(data)) return (data as Record<string, unknown>[]).map(normaliseProduct)
      const r = normaliseProductsResponse(data)
      return r.data
    } catch {
      // Fall back to newest products
      const { data } = await apiClient.get('/products', { params: { limit: 8, sortBy: 'newest' } })
      return normaliseProductsResponse(data).data
    }
  },

  async search(query: string): Promise<Product[]> {
    try {
      const { data } = await apiClient.get('/products/search', { params: { q: query } })
      if (Array.isArray(data)) return (data as Record<string, unknown>[]).map(normaliseProduct)
      return normaliseProductsResponse(data).data
    } catch {
      const { data } = await apiClient.get('/products', { params: { search: query } })
      return normaliseProductsResponse(data).data
    }
  },

  async getRelated(productId: number): Promise<Product[]> {
    try {
      const { data } = await apiClient.get(`/products/${productId}/related`)
      if (Array.isArray(data)) return (data as Record<string, unknown>[]).map(normaliseProduct)
      return normaliseProductsResponse(data).data
    } catch {
      const { data } = await apiClient.get('/products', { params: { limit: 4 } })
      return normaliseProductsResponse(data).data.filter((p) => p.id !== productId).slice(0, 4)
    }
  },
}

export default productService
