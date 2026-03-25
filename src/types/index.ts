// ─── Product ────────────────────────────────────────────────────────────────
export interface ProductVariant {
  id: string
  color?: string
  colorHex?: string
  size?: string
  priceModifier: number
  finalPrice: number
  stock: number
  imageUrl?: string
  isActive: boolean
  imageFile?: File | null
}

export interface Product {
  id: string
  name: string
  slug: string
  category: 'mujer' | 'hombre' | 'exteriores' | 'accesorios'
  price: number
  originalPrice?: number
  isNew: boolean
  isSale: boolean
  imageUrl: string
  material: string
  description: string
  rating: number
  reviewCount: number
  care: string
  origin: string
  tags: string[]
  isActive: boolean
  createdAt?: string
  stock?: number
  sizes?: Size[]
  colors?: ProductColor[]
  variants: ProductVariant[]
}

export type ProductFormData = Partial<Product> & {
  imageFile?: File | null
}

export type VariantFormData = Partial<ProductVariant> & {
  imageFile?: File | null
}

export interface ProductColor {
  name: string
  hex: string
}

export type Size = 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL'

export interface ProductFilters {
  category?: string
  minPrice?: number
  maxPrice?: number
  sizes?: Size[]
  colors?: string[]
  isNew?: boolean
  isSale?: boolean
  search?: string
  sortBy?: 'relevance' | 'price_asc' | 'price_desc' | 'newest'
  page?: number
  limit?: number
}

export interface ProductsResponse {
  data: Product[]
  total: number
  page: number
  totalPages: number
}

// ─── Cart ────────────────────────────────────────────────────────────────────
export interface CartItem {
  product: Product
  quantity: number
  selectedSize: Size
  selectedColor: ProductColor
}

export interface Cart {
  items: CartItem[]
  subtotal: number
  shipping: number
  total: number
}

// ─── Auth / User ─────────────────────────────────────────────────────────────
export interface User {
  id: number
  email: string
  firstName: string
  lastName: string
  avatar?: string
  phone?: string
  role: 'Customer' | 'Admin'
  addresses: Address[]
  createdAt: string
}

// ─── Review ──────────────────────────────────────────────────────────────────
export interface Review {
  id: number
  productId: number
  userId: number
  userName: string
  userAvatar?: string
  rating: number
  title: string
  body: string
  verified: boolean
  helpful: number
  createdAt: string
}

export interface ReviewsResponse {
  data: Review[]
  total: number
  averageRating: number
  ratingDistribution: Record<number, number>
}

export interface CreateReviewData {
  rating: number
  title: string
  body: string
}

// ─── Admin ───────────────────────────────────────────────────────────────────
export interface AdminStats {
  totalRevenue: number
  totalOrders: number
  totalUsers: number
  totalProducts: number
  revenueByMonth: { month: string; revenue: number }[]
  topProducts: { productId: number; productName: string; sold: number; revenue: number }[]
  newUsers: { date: string; count: number }[]
  ordersByStatus: Record<OrderStatus, number>
  recentOrders: Order[]
}

export interface Address {
  id: number
  label: string
  street: string
  city: string
  state: string
  zipCode: string
  country: string
  isDefault: boolean
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  firstName: string
  lastName: string
  email: string
  password: string
  confirmPassword: string
}

export interface AuthResponse {
  token: string
  email: string
  firstName: string
  role: "Customer" | "Admin"
  expiresAt: string
}

// ─── Order ───────────────────────────────────────────────────────────────────
export interface Order {
  id: string
  userId: number
  items: OrderItem[]
  subtotal: number
  shipping: number
  total: number
  status: OrderStatus
  shippingAddress: Address
  paymentMethod: string
  createdAt: string
  updatedAt: string
  trackingNumber?: string
}

export interface OrderItem {
  productId: number
  productName: string
  quantity: number
  price: number
  size: Size
  color: string
  imageUrl: string
}

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'

export interface CheckoutData {
  shippingAddressId?: number
  newAddress?: Omit<Address, 'id' | 'isDefault'>
  paymentMethod: 'card' | 'paypal' | 'transfer'
  cardData?: {
    number: string
    holder: string
    expiry: string
    cvv: string
  }
  promoCode?: string
}

// ─── API Generic ─────────────────────────────────────────────────────────────
export interface ApiError {
  message: string
  code?: string
  status?: number
}

export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}
