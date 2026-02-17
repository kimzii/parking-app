import api from "./api";

export const userService = {
  async getProfile() {
    const response = await api.get("/users/profile");
    return response.data;
  },
};
