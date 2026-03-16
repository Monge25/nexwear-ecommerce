import type { Product } from "@/types";

export const mapProductFromApi = (p: any): Product => ({
  id: p.id,
  name: p.name,
  slug: p.name.toLowerCase().replace(/\s+/g, "-"),
  category: p.category,

  price: p.price,
  originalPrice: undefined,

  isNew: true,
  isSale: false,

  images: [
    `https://nexwearapi-production.up.railway.app${p.imageUrl}`
  ],

  colors: [
    {
      name: p.color,
      hex: "#000000",
    },
  ],

  sizes: [p.size],

  material: "Algodón",
  description: p.description,

  rating: 5,
  reviewCount: 0,

  care: "Lavado en frío",
  origin: "México",

  stock: p.stock,
  tags: [],
});