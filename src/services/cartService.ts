import apiClient from './apiClient'

interface AddItemPayload {
  productId: string;
  variantId: string;
  quantity: number;
}

const cartService = {
  async getCart() {
    const { data } = await apiClient.get('/Cart')
    return data
  },

async addItem(payload: AddItemPayload) {
  try {
    const { data } = await apiClient.post('/Cart/items', payload)
    console.log(" Item agregado al carrito backend:", data)
    return data
  } catch (err: any) {
    console.error(" Error agregando al carrito backend:", err.response?.data)
    throw err
  }
},
  async updateItem(cartItemId: string, quantity: number) {
    const { data } = await apiClient.put(`/Cart/items/${cartItemId}`, { quantity })
    return data
  },

  async removeItem(cartItemId: string) {
    await apiClient.delete(`/Cart/items/${cartItemId}`)
  },

  async clearCart() {
    await apiClient.delete('/Cart')
  },
}

export default cartService