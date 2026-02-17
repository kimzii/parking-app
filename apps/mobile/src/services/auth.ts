import api from "./api";
import * as SecureStore from "expo-secure-store";

export const authService = {
  async login(email: string, password: string) {
    const response = await api.post("/auth/login", { email, password });
    const { accessToken, refreshToken } = response.data;

    // Save tokens securely
    await SecureStore.setItemAsync("accessToken", accessToken);
    await SecureStore.setItemAsync("refreshToken", refreshToken);

    return response.data;
  },

  async register(name: string, email: string, password: string) {
    // Adjusted to match your backend endpoint
    const response = await api.post("/auth/register", {
      name,
      email,
      password,
    });
    return response.data;
  },

  async logout() {
    await SecureStore.deleteItemAsync("accessToken");
    await SecureStore.deleteItemAsync("refreshToken");
  },

  async getToken() {
    return await SecureStore.getItemAsync("accessToken");
  },
};
