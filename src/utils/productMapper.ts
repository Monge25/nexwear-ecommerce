import type { Product } from "@/types";

export const mapProductFromApi = (p: any): Product => ({
  id:            p.id,
  name:          p.name,
  // slug:          p.slug ?? p.name.toLowerCase().replace(/\s+/g, "-"),
  category:      p.category,
  price:         p.price ?? p.basePrice ?? 0,
  originalPrice: p.originalPrice ?? undefined,
  isNew:         p.isNew ?? false,
  isSale:        p.isSale ?? false,
  imageUrl:      p.imageUrl ?? '',
  material:      p.material ?? '',
  description:   p.description ?? '',
  rating:        p.rating ?? 0,
  reviewCount:   p.reviewCount ?? 0,
  care:          p.care ?? '',
  origin:        p.origin ?? '',
  tags:          Array.isArray(p.tags) ? p.tags : [],
  isActive:      p.isActive ?? true,                    
  variants:      Array.isArray(p.variants)              
    ? p.variants.map((v: any) => ({
        id:            v.id,
        color:         v.color ?? undefined,
        colorHex:      v.colorHex ?? undefined,
        size:          v.size ?? undefined,
        priceModifier: v.priceModifier ?? 0,
        finalPrice:    v.finalPrice ?? p.price ?? 0,
        stock:         v.stock ?? 0,
        imageUrl:      v.imageUrl ?? undefined,
        isActive:      v.isActive ?? true,
      }))
    : [],
});