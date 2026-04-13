import apiClient from "@/config/axiosConfig";


export interface OrderItemResponse {
  id: string;
  productId: string;
  variantId: string;
  productName: string;
  variantColor?: string;
  variantSize?: string;
  imageUrl?: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface CheckoutPayload {
  token: string;
  paymentMethodId?: string;
  addressId?: string;
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
  orderNumber: string;
  status: string;
  total: number;
  subtotal?: number;   // ← agregar
  shipping?: number;   // ← agregar
  createdAt: string;
  paidAt?: string;
  paymentMethod?: string;
  street?: string;
  interior?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  phone?: string;
  fullAddress?: string;
  shippingAddress?: string;
  items: OrderItemResponse[];
  // [key: string]: unknown;
}

const orderService = {
  async checkout(payload: CheckoutPayload): Promise<OrderResponse> {
    const { data } = await apiClient.post("/Orders/checkout", payload);
    return (data?.order ?? data?.data ?? data) as OrderResponse;
  },

  async getOrders(): Promise<OrderResponse[]> {
    const { data } = await apiClient.get("/Orders");
    return (data?.orders ?? data?.data ?? data) as OrderResponse[];
  },
};

export default orderService;