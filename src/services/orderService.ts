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
  paymentMethodId: string;
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
  subtotal?: number;
  shipping?: number;
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
}

const orderService = {
  async checkout(payload: CheckoutPayload): Promise<OrderResponse> {
    const { data } = await apiClient.post("/Orders/checkout", payload);
    // La API regresa 201 con la orden directa
    const order = data?.order ?? data?.data ?? data;
    console.log("✅ Orden recibida del backend:", order);
    return order as OrderResponse;
  },

  async getOrders(): Promise<OrderResponse[]> {
    const { data } = await apiClient.get("/Orders");
    return (data?.orders ?? data?.data ?? data) as OrderResponse[];
  },
};

export default orderService;