import api from "./api";

export const userService = {
  async getProfile() {
    const response = await api.get("/users/profile");
    return response.data;
  },
  async updateProfile(firstName: string, lastName: string) {
    const response = await api.put("/users/profile", { firstName, lastName });
    return response.data;
  },
};
