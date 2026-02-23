import api from "./api";

export const walletService = {
  getBalance: async () => {
    const res = await api.get("/wallet/balance");
    return res.data;
  },
  topUp: async (amount: number) => {
    const res = await api.post("/wallet/top-up", { amount });
    return res.data;
  },
};
