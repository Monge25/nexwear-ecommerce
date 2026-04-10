import apiClient from "./apiClient";

export interface Address {
  id: string;
  label: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

const getUserAddresses = async (): Promise<Address[]> => {
  const res = await apiClient.get("/addresses");
  return res.data;
};

export default {
  getUserAddresses,
};