import apiClient from "./apiClient";
import type { Order } from "@/types";

interface CheckoutPayload {
  token: string;
  shippingAddress: string;
}

const orderService = {
async checkout(data: CheckoutPayload): Promise<Order> {
  try {
    const res = await apiClient.post("/Orders/checkout", data);
    return res.data;
  } catch (error: any) {
    console.log("Status:", error.response?.status);
    console.log("Response body:", JSON.stringify(error.response?.data, null, 2));
    console.log("Payload enviado:", JSON.stringify(data, null, 2));
    throw error;
  }
},
  async getOrders(): Promise<Order[]> {
    const res = await apiClient.get("/Orders");
    return res.data;
  },

  async getOrderById(id: string): Promise<Order> {
    const res = await apiClient.get(`/Orders/${id}`);
    return res.data;
  },
};

export default orderService;