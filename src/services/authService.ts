import apiClient from "@/services/apiClient"
import type { LoginCredentials, RegisterData, User } from "@/types"

const TOKEN_KEY = "nexwear_token"

const authService = {
  async login(credentials: LoginCredentials): Promise<User> {
    const { data } = await apiClient.post("/auth/login", credentials)
    localStorage.setItem(TOKEN_KEY, data.token)

    // Obtener perfil real para tener el id correcto (no hardcodear id: 0)
    const { data: profile } = await apiClient.get<User>("/Users/profile")
    return profile
  },

  async register(userData: RegisterData): Promise<User> {
    const { data } = await apiClient.post("/auth/register", userData)
    localStorage.setItem(TOKEN_KEY, data.token)

    // Igual que login, obtener perfil real
    const { data: profile } = await apiClient.get<User>("/Users/profile")
    return profile
  },

  async logout(): Promise<void> {
    localStorage.removeItem(TOKEN_KEY)
  },

  async getMe(): Promise<User> {
    const { data } = await apiClient.get<User>("/Users/profile")
    return data
  },

  async updateProfile(updates: Partial<User>): Promise<void> {
    await apiClient.put("/Users/profile", updates)
  },

  async changePassword(current: string, next: string): Promise<void> {
    await apiClient.post("/Users/change-password", {
      currentPassword: current,
      newPassword: next,
    })
  },

  async requestPasswordReset(email: string): Promise<void> {
    await apiClient.post("/auth/forgot-password", { email })
  },

  async verifyResetCode(email: string, code: string): Promise<void> {
  await apiClient.post('/auth/verify-reset-code', { email, code })
  },

  async resetPassword(email: string, code: string, newPassword: string): Promise<void> {
    await apiClient.post('/auth/reset-password', { email, code, newPassword })
  },

  

  // ── Addresses ────────────────────────────────────────────────────────

  async getAddresses() {
    const { data } = await apiClient.get("/Addresses")
    return data
  },

  async addAddress(address: any) {
    const { data } = await apiClient.post("/Addresses", address)
    return data
  },

  async updateAddress(id: string, address: any) {
    const { data } = await apiClient.put(`/Addresses/${id}`, address)
    return data
  },

  async setDefaultAddress(id: string) {
    const { data } = await apiClient.put(`/Addresses/${id}/default`, {})
    return data
  },

  async deleteAddress(id: string) {
    await apiClient.delete(`/Addresses/${id}`)
  },
}

export default authService