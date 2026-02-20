import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { MaterialIcons } from "@expo/vector-icons";

import { authService } from "../../src/services/auth";
import { userService } from "../../src/services/user";
import { User } from "../../src/types/user";
import { EWallet } from "../../src/components/EWallet";
import BecomeAHostButton from "../../src/components/BecomeAHostButton";
import DriverVerificationButton from "../../src/components/DriverVerificationButton";
import MenuItem from "../../src/components/MenuItem";


export default function ProfileScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const fetchUserIfToken = useCallback(async () => {
    setLoading(true);

    const token = await SecureStore.getItemAsync("accessToken");

    if (token) {
      try {
        const data = await userService.getProfile();
        setUser(data);
        console.log("Fetched user profile:", data);
      } catch (err) {
        console.error("Failed to fetch user profile:", err);
        setUser(null);
      } finally {
        setLoading(false);
      }
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
    <SafeAreaView style={styles.safeArea} edges={["left", "right"]}>
      <View style={styles.container}>
        {/* PROFILE HEADER */}
        <View style={styles.profileDetails}>
          <View style={styles.profileCircle}>
            <MaterialIcons name="person" size={64} color="#fff" />
          </View>

          <View>
            <Text style={styles.userName}>
              {loading
                ? "Loading..."
                : user
                  ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() ||
                    "-"
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
              <Text style={styles.updateProfileText}>Edit Profile</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.menuWrapper}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <EWallet
              balance={user?.walletBalance ?? 0}
              onTopUp={() => {}}
              onWithdraw={() => {}}
            />

            <BecomeAHostButton
              onPress={() => router.push("/(modals)/become-a-ahost")}
            />
            <DriverVerificationButton
              onPress={() => router.push("/(modals)/driver-verification")}
            />
            {/* SETTINGS */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => setSettingsOpen((open) => !open)}
            >
              <View style={styles.menuItemRow}>
                <Text style={styles.menuItemText}>Settings</Text>
                <MaterialIcons
                  name={
                    settingsOpen ? "keyboard-arrow-up" : "keyboard-arrow-right"
                  }
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

                <TouchableOpacity
                  style={styles.dropdownItem}
                  onPress={() => router.push("/(modals)/change-password")}
                >
                  <Text style={styles.dropdownItemText}>Change Password</Text>
                </TouchableOpacity>
              </View>
            )}

            <MenuItem label="My Vehicles" />
            <MenuItem label="Parking History" />
            <MenuItem label="Help & Support" />

            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
            >
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#11796F",
  },
  container: {
    flex: 1,
  },
  profileDetails: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 40,
  },
  profileCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#038A7A",
    alignItems: "center",
    justifyContent: "center",
  },
  userName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
  roleStatus: {
    fontSize: 12,
    color: "#fefefe",
    marginTop: 2,
  },
  updateProfileButton: {
    marginTop: 8,
    backgroundColor: "#038A7A",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  updateProfileText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  menuWrapper: {
    flex: 1,
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  menuItem: {
    paddingVertical: 14,
    marginBottom: 12,
  },
  menuItemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  menuItemText: {
    color: "#222",
    fontSize: 16,
  },
  dropdownMenu: {
    paddingHorizontal: 8,
    marginBottom: 12,
  },
  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  dropdownItemText: {
    fontSize: 15,
    color: "#222",
  },
  logoutButton: {
    backgroundColor: "#ff4444",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  logoutText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
