import { Stack, useRouter, useFocusEffect, usePathname } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { TouchableOpacity } from "react-native";
import { useCallback } from "react";
import * as SecureStore from "expo-secure-store";

export default function StackLayout() {
  const router = useRouter();
  const pathname = usePathname();

  useFocusEffect(
    useCallback(() => {
      // Allow public access to forgot-password and reset-password modals
      if (
        pathname.endsWith("forgot-password") ||
        pathname.endsWith("reset-password")
      ) {
        return;
      }
      const checkToken = async () => {
        const token = await SecureStore.getItemAsync("accessToken");
        if (!token) {
          router.replace("/(auth)/login");
        }
      };
      checkToken();
    }, [router, pathname]),
  );

  const goBack = () => {
    if (
      pathname.endsWith("forgot-password") ||
      pathname.endsWith("reset-password")
    ) {
      router.replace("/(auth)/login");
    } else {
      router.back();
    }
  };

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#fff" },
        headerTintColor: "#D4501E",
        statusBarTranslucent: false,
        statusBarStyle: "dark",
        headerTitle: "",
        headerLeft: () => (
          <TouchableOpacity
            onPress={goBack}
            style={{ marginLeft: 4 }}
          >
            <MaterialIcons
              name="arrow-back-ios-new"
              size={24}
              color="#D4501E"
            />
          </TouchableOpacity>
        ),
      }}
    />
  );
}
