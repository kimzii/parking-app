import api from "./api";

export const userService = {
  async getProfile() {
    const response = await api.get("/users/profile");
    return response.data;
  },
  async updateProfile(data: {
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
    profilePicture?: string;
    sex?: string;
    dateOfBirth?: string;
  }) {
    const response = await api.put("/users/profile", data);
    return response.data;
  },
  async changePassword(currentPassword: string, newPassword: string) {
    const response = await api.put("/users/change-password", {
      currentPassword,
      newPassword,
    });
    return response.data;
  },
  async uploadProfilePicture(uri: string) {
    const formData = new FormData();
    formData.append("file", {
      uri,
      name: "profile.jpg",
      type: "image/jpeg",
    } as unknown as Blob);

    const response = await api.post("/users/upload-profile-picture", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },
};
