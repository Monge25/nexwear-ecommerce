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
    const { data } = await apiClient.get<User>("/Users/profile")  // era /auth/me
    return data
  },

  async updateProfile(updates: Partial<User>): Promise<void> {
    await apiClient.put("/Users/profile", updates)  // era /auth/me
  },

  async changePassword(current: string, next: string): Promise<void> {
    await apiClient.post("/Users/change-password", {  // era /auth/change-password
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

// ── Addresses ─────────────────────────────────────────

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