import apiClient from "@/services/apiClient"
import type { LoginCredentials, RegisterData, User } from "@/types"

const TOKEN_KEY = "nexwear_token"

const authService = {
  async login(credentials: LoginCredentials): Promise<User> {
    const { data } = await apiClient.post("/auth/login", credentials)

    localStorage.setItem(TOKEN_KEY, data.token)

    const user: User = {
      id: 0,
      email: data.email,
      firstName: data.firstName,
      lastName: "",
      role: data.role as "Customer" | "Admin",
      addresses: [],
      createdAt: new Date().toISOString(),
    }

    return user
  },

  async register(userData: RegisterData): Promise<User> {
    const { data } = await apiClient.post("/auth/register", userData)

    localStorage.setItem(TOKEN_KEY, data.token)

    const user: User = {
      id: 0,
      email: data.email,
      firstName: data.firstName,
      lastName: "",
      role: data.role as "Customer" | "Admin",
      addresses: [],
      createdAt: new Date().toISOString(),
    }

    return user
  },

  async logout(): Promise<void> {
    localStorage.removeItem(TOKEN_KEY)
  },

  async getMe(): Promise<User> {
    const { data } = await apiClient.get<User>("/auth/me")
    return data
  },

  async updateProfile(updates: Partial<User>): Promise<User> {
    const { data } = await apiClient.put<User>("/auth/me", updates)
    return data
  },

  async changePassword(current: string, next: string): Promise<void> {
    await apiClient.post("/auth/change-password", {
      currentPassword: current,
      newPassword: next,
    })
  },

  async requestPasswordReset(email: string): Promise<void> {
    await apiClient.post("/auth/forgot-password", { email })
  },

  async resetPassword(token: string, newPassword: string): Promise<void> {
    await apiClient.post("/auth/reset-password", {
      token,
      newPassword,
    })
  },

  isAuthenticated(): boolean {
    return !!localStorage.getItem(TOKEN_KEY)
  },

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY)
  },
}

export default authService