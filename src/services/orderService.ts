import apiClient from "./apiClient"
import type { Order } from "@/types"

// ── Crear Orden ─────────────────────────────────────
const createOrder = async (
  data: any
): Promise<Order> => {

  const res = await apiClient.post(
    "/orders",
    data
  )

  return res.data
}

// ── Obtener órdenes del usuario ─────────────────────
const getOrders = async (): Promise<Order[]> => {

  const res = await apiClient.get(
    "/orders"
  )

  return res.data
}

// ── Obtener orden por ID (para detalle) ─────────────
const getOrderById = async (
  id: string
): Promise<Order> => {

  const res = await apiClient.get(
    `/orders/${id}`
  )

  return res.data
}

export default {
  createOrder,
  getOrders,
  getOrderById
}