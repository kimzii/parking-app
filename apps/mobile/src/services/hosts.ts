import api from "./api";
import * as SecureStore from "expo-secure-store";

export const hostService = {
  uploadImages: async (imageUris: string[]): Promise<string[]> => {
    const formData = new FormData();
    for (const uri of imageUris) {
      const filename = uri.split("/").pop() || "photo.jpg";
      const ext = filename.split(".").pop()?.toLowerCase() || "jpg";
      const mimeType = ext === "png" ? "image/png" : "image/jpeg";
      formData.append("files", {
        uri,
        name: filename,
        type: mimeType,
      } as any);
    }
    const token = await SecureStore.getItemAsync("accessToken");
    const res = await api.post("/hosts/upload-images", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
        Authorization: `Bearer ${token}`,
      },
    });
    return res.data.urls;
  },
  uploadProofOfResidence: async (imageUri: string): Promise<string> => {
    const formData = new FormData();
    const filename = imageUri.split("/").pop() || "proof.jpg";
    const ext = filename.split(".").pop()?.toLowerCase() || "jpg";
    const mimeType = ext === "png" ? "image/png" : "image/jpeg";
    formData.append("files", {
      uri: imageUri,
      name: filename,
      type: mimeType,
    } as any);
    const token = await SecureStore.getItemAsync("accessToken");
    const res = await api.post("/hosts/upload-proof-of-residence", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
        Authorization: `Bearer ${token}`,
      },
    });
    return res.data.url;
  },
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
  getPublicLocation: async (id: string) => {
    const res = await api.get(`/hosts/parking/${id}`);
    return res.data;
  },
  getNearbyLocations: async (params?: {
    latitude?: number;
    longitude?: number;
    radius?: number;
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
    levelSlots?: number[];
    spaceNames?: string[];
    imageUrls?: string[];
    proofOfResidenceUrl?: string;
    openTime?: string;
    closeTime?: string;
    is24Hours?: boolean;
  }) => {
    const res = await api.post("/hosts/locations", data);
    return res.data;
  },
};
