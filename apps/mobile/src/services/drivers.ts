import api from "./api";

export const driversService = {
  applyAsDriver: async (payload: {
    licenseNumber: string;
    licenseImageUrl?: string;
  }) => {
    const res = await api.post("/drivers/apply", payload);
    return res.data;
  },
};
