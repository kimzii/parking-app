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

  async logout() {
    await SecureStore.deleteItemAsync("accessToken");
    await SecureStore.deleteItemAsync("refreshToken");
  },

  async getToken() {
    return await SecureStore.getItemAsync("accessToken");
  },
};
