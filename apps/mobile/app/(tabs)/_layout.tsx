import { Tabs, useRouter, useFocusEffect } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { useCallback } from "react";
import * as SecureStore from "expo-secure-store";

export default function TabLayout() {
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
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#11796F",
        headerShown: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarLabel: "Home",
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="home" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarLabel: "Profile",
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="person" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
