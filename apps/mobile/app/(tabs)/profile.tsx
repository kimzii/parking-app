import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useState, useCallback } from "react";
import { router, useFocusEffect } from "expo-router";
import { authService } from "../../src/services/auth";
import { userService } from "../../src/services/user";
import * as SecureStore from "expo-secure-store";
import { MaterialIcons } from "@expo/vector-icons";
import { User } from "../../src/types/user";

export default function ProfileScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const fetchUserIfToken = useCallback(async () => {
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
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchUserIfToken();
    }, [fetchUserIfToken]),
  );

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
          <TouchableOpacity
            style={styles.updateProfileButton}
            onPress={() => router.push("/(modals)/update-profile")}
          >
            <Text style={styles.updateProfileText}>Update Profile</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.menu}>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => setSettingsOpen((open) => !open)}
        >
          <View style={styles.menuItemRow}>
            <Text style={styles.menuItemText}>Settings</Text>
            <MaterialIcons
              name={settingsOpen ? "keyboard-arrow-up" : "keyboard-arrow-right"}
              size={20}
              color="black"
            />
          </View>
        </TouchableOpacity>
        {settingsOpen && (
          <View style={styles.dropdownMenu}>
            <TouchableOpacity
              style={styles.dropdownItem}
              onPress={() => router.push("/(modals)/forgot-password")}
            >
              <Text style={styles.dropdownItemText}>Forgot Password</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dropdownItem} onPress={() => router.push("/(modals)/change-password")}>
              <Text style={styles.dropdownItemText}>Change Password</Text>
            </TouchableOpacity>
          </View>
        )}
        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuItemRow}>
            <Text style={styles.menuItemText}>My Vehicles</Text>
            <MaterialIcons
              name="keyboard-arrow-right"
              size={20}
              color="black"
            />
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuItemRow}>
            <Text style={styles.menuItemText}>Parking History</Text>
            <MaterialIcons
              name="keyboard-arrow-right"
              size={20}
              color="black"
            />
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuItemRow}>
            <Text style={styles.menuItemText}>Help & Support</Text>
            <MaterialIcons
              name="keyboard-arrow-right"
              size={20}
              color="black"
            />
          </View>
        </TouchableOpacity>
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
    backgroundColor: "#11796F",
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
    backgroundColor: "#038A7A",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  roleStatus: {
    fontSize: 12,
    color: "#fefefe",
  },
  userName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
  updateProfileButton: {
    marginTop: 8,
    backgroundColor: "#038A7A",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  updateProfileText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
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
  menuItem: {
    paddingVertical: 14,
    width: "100%",
    marginBottom: 12,
  },
  menuItemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  menuItemText: {
    color: "#222222",
    fontSize: 16,
  },
  dropdownMenu: {
    width: "100%",
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginBottom: 2,
  },
  dropdownItemText: {
    color: "#222222",
    fontSize: 15,
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
