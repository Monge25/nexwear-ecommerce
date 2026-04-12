import apiClient from "./apiClient";

export interface Address {
  id: string;
  alias: string;
  label?: string;   // compatibilidad hacia atrás
  street: string;
  interior?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone?: string;
  isDefault?: boolean;
}

const getUserAddresses = async (): Promise<Address[]> => {
  const res = await apiClient.get("/Addresses");  // era /addresses (minúscula)
  return res.data;
};

export default { getUserAddresses };