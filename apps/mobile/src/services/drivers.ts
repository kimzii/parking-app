import api from "./api";

export const driversService = {
  getProfile: async () => {
    const res = await api.get("/drivers/profile");
    return res.data;
  },
  applyAsDriver: async (payload: {
    licenseNumber: string;
    licenseImageUrl?: string;
  }) => {
    const res = await api.post("/drivers/apply", payload);
    return res.data;
  },
  uploadLicenseImage: async (uri: string) => {
    const filename = uri.split("/").pop() || "license.jpg";
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : "image/jpeg";

    const formData = new FormData();
    formData.append("file", {
      uri,
      name: filename,
      type,
    } as unknown as Blob);

    const res = await api.post("/drivers/upload-license", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },
  getVehicles: async () => {
    const res = await api.get("/drivers/vehicles", {
      params: { isActive: true },
    });
    return res.data;
  },
  addVehicle: async (data: {
    plateNumber: string;
    vehicleType?: string;
    brand?: string;
    model?: string;
    color?: string;
  }) => {
    const res = await api.post("/drivers/vehicles", data);
    return res.data;
  },
  updateVehicle: async (
    vehicleId: string,
    data: {
      plateNumber?: string;
      vehicleType?: string;
      brand?: string;
      model?: string;
      color?: string;
      isActive?: boolean;
    },
  ) => {
    const res = await api.put(`/drivers/vehicles/${vehicleId}`, data);
    return res.data;
  },
  deleteVehicle: async (vehicleId: string) => {
    const res = await api.delete(`/drivers/vehicles/${vehicleId}`);
    return res.data;
  },
  uploadVehicleRegistration: async (vehicleId: string, formData: FormData) => {
    const res = await api.post(
      `/drivers/vehicles/${vehicleId}/upload-registration`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return res.data;
  },
};
