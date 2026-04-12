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

  async register(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    sex: string;
    termsAccepted: boolean;
    privacyAccepted: boolean;
  }) {
    const response = await api.post("/auth/register", data);
    return response.data;
  },

  async verifyEmail(email: string, code: string) {
    const response = await api.post("/auth/verify-email", {
      email,
      code,
    });
    return response.data;
  },

  async selectRole(role: string) {
    const response = await api.post("/auth/select-role", { role });
    return response.data;
  },

  async resendVerification(email: string) {
    const response = await api.post("/auth/resend-verification", { email });
    return response.data;
  },

  async forgotPassword(email: string) {
    const response = await api.post("/auth/forgot-password", { email });
    return response.data;
  },

  async logout() {
    await SecureStore.deleteItemAsync("accessToken");
    await SecureStore.deleteItemAsync("refreshToken");
  },

  async resetPassword(email: string, code: string, newPassword: string) {
    const response = await api.post("/auth/reset-password", {
      email,
      code,
      newPassword,
    });
    return response.data;
  },

  async getToken() {
    return await SecureStore.getItemAsync("accessToken");
  },
};
