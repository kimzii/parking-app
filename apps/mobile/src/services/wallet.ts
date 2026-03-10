import api from "./api";

export interface Transaction {
  id: string;
  type: "CREDIT" | "DEBIT";
  source: string;
  amount: string;
  balanceBefore: string;
  balanceAfter: string;
  createdAt: string;
}

export const walletService = {
  getBalance: async () => {
    const res = await api.get("/wallet/balance");
    return res.data;
  },
  topUp: async (amount: number) => {
    const res = await api.post("/wallet/top-up", { amount });
    return res.data;
  },
  withdraw: async (amount: number) => {
    const res = await api.post("/wallet/withdraw", { amount });
    return res.data;
  },
  getTransactions: async (limit = 20): Promise<Transaction[]> => {
    const res = await api.get("/wallet/transactions", {
      params: { limit },
    });
    return res.data;
  },
};
