import api from "./api";

export const hostService = {
  becomeHost: async () => {
    const res = await api.post("/hosts/become");
    return res.data;
  },
  getProfile: async () => {
    const res = await api.get("/hosts/profile");
    return res.data;
  },
  getStatistics: async () => {
    const res = await api.get("/hosts/statistics");
    return res.data;
  },
  getLocations: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  }) => {
    const res = await api.get("/hosts/locations", { params });
    return res.data;
  },
  getLocation: async (id: string) => {
    const res = await api.get(`/hosts/locations/${id}`);
    return res.data;
  },
};
