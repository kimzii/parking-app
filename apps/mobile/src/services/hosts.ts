import api from "./api";
import * as SecureStore from "expo-secure-store";
import * as ImageManipulator from "expo-image-manipulator";

export interface HostProfile {
  id: string;
  userId: string;
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    phoneNumber: string | null;
    profilePicture: string | null;
    createdAt: string;
  };
  averageRating: number | null;
  totalReviews: number;
  totalLocations: number;
  approvedLocations: number;
  pendingLocations: number;
}

export const hostService = {
  uploadImages: async (
    imageUris: string[],
    locationName?: string,
  ): Promise<string[]> => {
    console.log("[uploadImages] start, count:", imageUris.length);
    const formData = new FormData();
    for (let i = 0; i < imageUris.length; i++) {
      const compressed = await ImageManipulator.manipulateAsync(
        imageUris[i],
        [{ resize: { width: 1024 } }],
        { compress: 0.65, format: ImageManipulator.SaveFormat.JPEG },
      );
      console.log(`[uploadImages] image ${i} compressed uri:`, compressed.uri);
      formData.append("files", {
        uri: compressed.uri,
        name: `photo_${i}.jpg`,
        type: "image/jpeg",
      } as any);
    }
    if (locationName) {
      formData.append("locationName", locationName);
    }
    const token = await SecureStore.getItemAsync("accessToken");
    console.log("[uploadImages] token present:", !!token);
    try {
      const res = await api.post("/hosts/upload-images", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
      });
      console.log("[uploadImages] success, urls:", res.data.urls);
      return res.data.urls;
    } catch (e: any) {
      console.log("[uploadImages] FAILED:", e?.response?.status, JSON.stringify(e?.response?.data));
      throw e;
    }
  },
  uploadProofOfResidence: async (
    imageUri: string,
    locationName?: string,
  ): Promise<string> => {
    console.log("[uploadProofOfResidence] start");
    const formData = new FormData();
    const compressed = await ImageManipulator.manipulateAsync(
      imageUri,
      [{ resize: { width: 1024 } }],
      { compress: 0.65, format: ImageManipulator.SaveFormat.JPEG },
    );
    console.log("[uploadProofOfResidence] compressed uri:", compressed.uri);
    formData.append("files", {
      uri: compressed.uri,
      name: "proof.jpg",
      type: "image/jpeg",
    } as any);
    if (locationName) {
      formData.append("locationName", locationName);
    }
    const token = await SecureStore.getItemAsync("accessToken");
    console.log("[uploadProofOfResidence] token present:", !!token);
    try {
      const res = await api.post("/hosts/upload-proof-of-residence", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
      });
      console.log("[uploadProofOfResidence] success, url:", res.data.url);
      return res.data.url;
    } catch (e: any) {
      console.log("[uploadProofOfResidence] FAILED:", e?.response?.status, JSON.stringify(e?.response?.data));
      throw e;
    }
  },
  becomeHost: async () => {
    const res = await api.post("/hosts/become");
    return res.data;
  },
  getProfile: async (): Promise<HostProfile> => {
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
    acceptedVehicles?: string[];
  }) => {
    const res = await api.post("/hosts/locations", data);
    return res.data;
  },
  updateLocation: async (
    id: string,
    data: {
      title?: string;
      description?: string;
      address?: string;
      latitude?: number;
      longitude?: number;
      basePricePerHour?: number;
      imageUrls?: string[];
      openTime?: string;
      closeTime?: string;
      is24Hours?: boolean;
      acceptedVehicles?: string[];
    },
  ) => {
    const res = await api.put(`/hosts/locations/${id}`, data);
    return res.data;
  },
  toggleLocation: async (locationId: string) => {
    const res = await api.put(`/hosts/locations/${locationId}/toggle`);
    return res.data;
  },
  toggleSpace: async (spaceId: string) => {
    const res = await api.put(`/hosts/spaces/${spaceId}/toggle`);
    return res.data;
  },
  deleteSpace: async (spaceId: string) => {
    const res = await api.delete(`/hosts/spaces/${spaceId}`);
    return res.data;
  },
  deleteLocation: async (locationId: string) => {
    const res = await api.delete(`/hosts/locations/${locationId}`);
    return res.data;
  },
};
