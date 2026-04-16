import apiClient from './apiClient'

interface AddItemPayload {
  productId: string;
  variantId: string;
  quantity: number;
}

// Estructura que devuelve el backend por cada item del carrito
export interface BackendCartItem {
  id: string;          // cartItemId — necesario para update/delete
  productId: string;
  variantId: string;
  productName: string;
  imageUrl: string;
  color: string;
  colorHex: string;
  size: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  stock: number;
}

export interface BackendCartResponse {
  items: BackendCartItem[];
  totalItems: number;
  total: number;
}

const cartService = {
  async getCart(): Promise<BackendCartResponse> {
    const { data } = await apiClient.get('/Cart')
    return data
  },

  async addItem(payload: AddItemPayload): Promise<BackendCartResponse> {
    try {
      const { data } = await apiClient.post('/Cart/items', payload)
      return data
    } catch (err: any) {
      console.error('Error agregando al carrito backend:', err.response?.data)
      throw err
    }
  },

  async updateItem(cartItemId: string, quantity: number): Promise<BackendCartResponse> {
    const { data } = await apiClient.put(`/Cart/items/${cartItemId}`, { quantity })
    return data
  },

  async removeItem(cartItemId: string): Promise<void> {
    await apiClient.delete(`/Cart/items/${cartItemId}`)
  },

  async clearCart(): Promise<void> {
    await apiClient.delete('/Cart')
  },
}

export default cartService