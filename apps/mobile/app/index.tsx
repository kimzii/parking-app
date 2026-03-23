import { useEffect, useState } from "react";
import { Redirect } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import * as SecureStore from "expo-secure-store";
import { authService } from "../src/services/auth";
import { userService } from "../src/services/user";

export default function Index() {
  const [loading, setLoading] = useState(true);
  const [route, setRoute] = useState<string>("/(auth)/login");

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await authService.getToken();
      if (!token) {
        setRoute("/(auth)/login");
        setLoading(false);
        return;
      }

      // Fetch user profile to determine onboarding state
      const profile = await userService.getProfile();
      const roles: string[] = profile.roles || [];
      const roleStatuses: { role: string; status: string }[] =
        profile.roleStatuses || [];

      // No roles yet — needs to select a role
      if (roles.length === 0) {
        setRoute("/(auth)/select-role");
        setLoading(false);
        return;
      }

      // Has role but no name — needs to complete profile
      if (!profile.firstName) {
        const selectedRole = roles.includes("HOST") ? "HOST" : "DRIVER";
        setRoute(`/(auth)/complete-profile?role=${selectedRole}`);
        setLoading(false);
        return;
      }

      // Fully onboarded — determine destination
      if (roles.includes("HOST") && !roles.includes("DRIVER")) {
        // HOST-only user — always go to host tabs
        await SecureStore.setItemAsync("viewMode", "host");
        setRoute("/(host-tabs)");
      } else {
        const viewMode = await SecureStore.getItemAsync("viewMode");
        if (viewMode === "host" && roles.includes("HOST")) {
          setRoute("/(host-tabs)");
        } else {
          await SecureStore.setItemAsync("viewMode", "driver");
          setRoute("/(tabs)");
        }
      }
    } catch {
      // Token might be invalid, go to login
      setRoute("/(auth)/login");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#fff",
        }}
      >
        <ActivityIndicator size="large" color="#D4501E" />
      </View>
    );
  }

  return <Redirect href={route as any} />;
}
