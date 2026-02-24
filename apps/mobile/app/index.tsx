import { useEffect, useState } from "react";
import { Redirect } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import * as SecureStore from "expo-secure-store";
import { authService } from "../src/services/auth";

export default function Index() {
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [initialRoute, setInitialRoute] = useState<string>("/(tabs)");

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await authService.getToken();
      setIsLoggedIn(!!token);
      if (token) {
        const viewMode = await SecureStore.getItemAsync("viewMode");
        if (viewMode === "host") {
          setInitialRoute("/(host-tabs)");
        }
      }
    } catch {
      setIsLoggedIn(false);
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
        <ActivityIndicator size="large" color="#11796F" />
      </View>
    );
  }

  return <Redirect href={isLoggedIn ? initialRoute : "/(auth)/login"} />;
}
