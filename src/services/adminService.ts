import apiClient from './apiClient'
import type { AdminStats, Product, Order, User } from '@/types'

const adminService = {
  // ── Dashboard ──────────────────────────────────────────────────────────────
  async getStats(): Promise<AdminStats> {
    const { data } = await apiClient.get<AdminStats>('/admin/stats')
    return data
  },

  // ── Products ───────────────────────────────────────────────────────────────
  async getProducts(page = 1, limit = 20): Promise<{ data: Product[]; total: number }> {
    const { data } = await apiClient.get('/admin/products', { params: { page, limit } })
    return data
  },

  async createProduct(product: Omit<Product, 'id'>): Promise<Product> {
    const { data } = await apiClient.post<Product>('/admin/products', product)
    return data
  },

  async updateProduct(id: number, updates: Partial<Product>): Promise<Product> {
    const { data } = await apiClient.put<Product>(`/admin/products/${id}`, updates)
    return data
  },

  async deleteProduct(id: number): Promise<void> {
    await apiClient.delete(`/admin/products/${id}`)
  },

  // ── Orders ─────────────────────────────────────────────────────────────────
  async getOrders(page = 1, status?: string): Promise<{ data: Order[]; total: number }> {
    const { data } = await apiClient.get('/admin/orders', { params: { page, status } })
    return data
  },

  async updateOrderStatus(id: string, status: string): Promise<Order> {
    const { data } = await apiClient.put<Order>(`/admin/orders/${id}/status`, { status })
    return data
  },

  // ── Users ──────────────────────────────────────────────────────────────────
  async getUsers(page = 1): Promise<{ data: User[]; total: number }> {
    const { data } = await apiClient.get('/admin/users', { params: { page } })
    return data
  },

  async updateUserRole(id: number, role: 'user' | 'admin'): Promise<User> {
    const { data } = await apiClient.put<User>(`/admin/users/${id}/role`, { role })
    return data
  },
}

export default adminService
