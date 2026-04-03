export interface ProductVariant {
  colorName: string
  colorHex: string
  imageUrl: string | null
  sizes: string[]        // ej. ['XS','S','M','L','XL']
  isOnSale: boolean
}

export interface Product {
  slug: string
  name: string
  category: string
  price: number
  originalPrice?: number
  imageUrl?: string        // fallback si no hay variants
  // isNew?: boolean
  // isSale?: boolean
  variants: ProductVariant[]     // <-- nuevo
  colors?: { name: string; hex: string }[]  // legacy, por si acaso
  care?: string
  origin: string
}