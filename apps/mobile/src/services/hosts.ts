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
  getNearbyLocations: async (params?: {
    latitude?: number;
    longitude?: number;
    search?: string;
    limit?: number;
  }) => {
    const res = await api.get("/hosts/parking/nearby", { params });
    return res.data;
  },
  createLocation: async (data: {
    title: string;
    address: string;
    latitude: number;
    longitude: number;
    basePricePerHour: number;
    description?: string;
    totalSlots?: number;
    isMultiLevel?: boolean;
    numberOfLevels?: number;
    imageUrls?: string[];
  }) => {
    const res = await api.post("/hosts/locations", data);
    return res.data;
  },
};
