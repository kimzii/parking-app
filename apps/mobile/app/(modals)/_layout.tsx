import { Stack, useRouter, useFocusEffect } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { TouchableOpacity } from "react-native";
import { useCallback } from "react";
import * as SecureStore from "expo-secure-store";

export default function StackLayout() {
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      const checkToken = async () => {
        const token = await SecureStore.getItemAsync("accessToken");
        if (!token) {
          router.replace("/(auth)/login");
        }
      };
      checkToken();
    }, [router]),
  );

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#fff" },
        headerTintColor: "#11796F",
        headerTitle: "", // Hide the title
        headerLeft: () => (
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ marginLeft: 4 }}
          >
            <MaterialIcons
              name="arrow-back-ios-new"
              size={24}
              color="#11796F"
            />
          </TouchableOpacity>
        ),
      }}
    />
  );
}
