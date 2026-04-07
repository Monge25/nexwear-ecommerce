import apiClient from './apiClient'

const createOrder = async (data: any) => {

  const res = await apiClient.post(
    "/orders",
    data
  );

  return res.data;

};

export default {
  createOrder
};