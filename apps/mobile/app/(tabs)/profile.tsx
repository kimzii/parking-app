import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useEffect, useState } from "react";
import { router } from "expo-router";
import { authService } from "../../src/services/auth";
import { userService } from "../../src/services/user";
import * as SecureStore from "expo-secure-store";
import { MaterialIcons } from "@expo/vector-icons";
import { User } from "../../src/types/user";

export default function ProfileScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserIfToken = async () => {
      setLoading(true);
      const token = await SecureStore.getItemAsync("accessToken");
      if (token) {
        userService
          .getProfile()
          .then((data) => {
            setUser(data);
            console.log("Fetched user profile:", data);
          })
          .catch((err) => {
            setUser(null);
            console.error("Failed to fetch user profile:", err);
          })
          .finally(() => setLoading(false));
      } else {
        setUser(null);
        setLoading(false);
      }
    };
    fetchUserIfToken();
  }, []);

  const handleLogout = async () => {
    await authService.logout();
    router.replace("/(auth)/login");
  };

  return (
    <View style={styles.container}>
      <View style={styles.profileDetails}>
        <View style={styles.profileCircle}>
          <MaterialIcons name="person" size={64} color="#fff" />
        </View>
        <View>
          <Text style={styles.userName}>
            {loading
              ? "Loading..."
              : user
                ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || "-"
                : "-"}
          </Text>
          <Text style={styles.roleStatus}>
            {user?.roleStatuses?.find((r) => r.role === "DRIVER")?.status ===
            "VERIFIED"
              ? "Driver verified"
              : "Driver not verified"}
          </Text>
        </View>
      </View>
      <View style={styles.menu}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#00665A",
  },
  profileDetails: {
    width: "100%",
    alignItems: "center",
    flexDirection: "row",
    gap: 16,
    padding: 16,
  },
  profileCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#11796F",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  roleStatus: {
    fontSize: 14,
    color: "#fff",
    marginTop: 4,
    backgroundColor: "#038878",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  userName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },
  menu: {
    width: "100%",
    backgroundColor: "#fff",
    padding: 16,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    alignItems: "center",
    height: "100%",
  },
  logoutButton: {
    backgroundColor: "#ff4444",
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 8,
    width: "100%",
    alignItems: "center",
  },
  logoutText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
