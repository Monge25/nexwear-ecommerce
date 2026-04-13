import apiClient from "@/config/axiosConfig";

// ── Shape exacto que espera el endpoint POST /Orders/checkout ──────────────
export interface CheckoutPayload {
  token: string;
  // Opción A — dirección guardada
  addressId?: string;
  // Opción B — dirección nueva
  street?: string;
  interior?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  phone?: string;
  saveAddress?: boolean;
  addressAlias?: string;
}

export interface OrderResponse {
  id: string;
  status: string;
  total: number;
  createdAt: string;
  [key: string]: unknown;
}

const orderService = {
  async checkout(payload: CheckoutPayload): Promise<OrderResponse> {
    const { data } = await apiClient.post("/Orders/checkout", payload);
    // El backend puede devolver la orden directamente o envuelta en .data
    return (data?.order ?? data?.data ?? data) as OrderResponse;
  },
};

export default orderService;