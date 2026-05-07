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

export interface TopUpRequest {
  id: string;
  amount: string;
  referenceCode: string;
  proofImageUrl: string | null;
  status: "PENDING" | "ACCEPTED" | "APPROVED" | "REJECTED" | "EXPIRED";
  expiresAt: string | null;
  createdAt: string;
}

export interface WithdrawRequest {
  id: string;
  amount: string;
  referenceNumber: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
}

export const walletService = {
  getBalance: async () => {
    const res = await api.get("/wallet/balance");
    return res.data;
  },

  // Top-Up
  createTopUp: async (amount: number): Promise<TopUpRequest> => {
    const res = await api.post("/wallet/top-up", { amount });
    return res.data;
  },
  getTopUpStatus: async (requestId: string): Promise<TopUpRequest> => {
    const res = await api.get(`/wallet/top-up/${requestId}/status`);
    return res.data;
  },
  uploadTopUpProof: async (requestId: string, imageUri: string) => {
    const formData = new FormData();
    const filename = imageUri.split("/").pop() || "proof.jpg";
    const ext = filename.split(".").pop()?.toLowerCase() || "jpg";
    const mimeType = ext === "png" ? "image/png" : "image/jpeg";
    formData.append("file", {
      uri: imageUri,
      name: filename,
      type: mimeType,
    } as any);
    const res = await api.post(`/wallet/top-up/${requestId}/upload-proof`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },
  getMyTopUpRequests: async (): Promise<TopUpRequest[]> => {
    const res = await api.get("/wallet/top-up/my-requests");
    return res.data;
  },

  // Withdraw
  createWithdraw: async (amount: number): Promise<WithdrawRequest> => {
    const res = await api.post("/wallet/withdraw", { amount });
    return res.data;
  },
  getMyWithdrawRequests: async (): Promise<WithdrawRequest[]> => {
    const res = await api.get("/wallet/withdraw/my-requests");
    return res.data;
  },

  // Transactions
  getTransactions: async (limit = 20): Promise<Transaction[]> => {
    const res = await api.get("/wallet/transactions", {
      params: { limit },
    });
    return res.data;
  },
};
