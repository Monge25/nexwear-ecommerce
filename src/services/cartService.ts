import apiClient from './apiClient'
import type { Cart, CartItem, Size, ProductColor } from '@/types'

const cartService = {
  async getCart(): Promise<Cart> {
    const { data } = await apiClient.get<Cart>('/cart')
    return data
  },

  async addItem(
    productId: number,
    quantity: number,
    size: Size,
    color: ProductColor,
  ): Promise<Cart> {
    const { data } = await apiClient.post<Cart>('/cart/items', {
      productId,
      quantity,
      size,
      color,
    })
    return data
  },

  async updateItem(itemId: number, quantity: number): Promise<Cart> {
    const { data } = await apiClient.put<Cart>(`/cart/items/${itemId}`, { quantity })
    return data
  },

  async removeItem(itemId: number): Promise<Cart> {
    const { data } = await apiClient.delete<Cart>(`/cart/items/${itemId}`)
    return data
  },

  async clearCart(): Promise<void> {
    await apiClient.delete('/cart')
  },

  async applyPromo(code: string): Promise<{ discount: number; message: string }> {
    const { data } = await apiClient.post('/cart/promo', { code })
    return data
  },
}

export default cartService
