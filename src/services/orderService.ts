import apiClient from './apiClient'
import type { Order, CheckoutData } from '@/types'

const orderService = {
  async createOrder(checkoutData: CheckoutData): Promise<Order> {
    const { data } = await apiClient.post<Order>('/orders', checkoutData)
    return data
  },

  async getOrders(): Promise<Order[]> {
    const { data } = await apiClient.get<Order[]>('/orders')
    return data
  },

  async getOrderById(id: string): Promise<Order> {
    const { data } = await apiClient.get<Order>(`/orders/${id}`)
    return data
  },

  async cancelOrder(id: string): Promise<Order> {
    const { data } = await apiClient.post<Order>(`/orders/${id}/cancel`)
    return data
  },
}

export default orderService
