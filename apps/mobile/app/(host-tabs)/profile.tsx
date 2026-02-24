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
import { Image } from "expo-image";

import { authService } from "../../src/services/auth";
import { userService } from "../../src/services/user";
import { User } from "../../src/types/user";
import { EWallet } from "../../src/components/EWallet";
import { useViewMode } from "../../src/contexts/ViewModeContext";
import MenuItem from "../../src/components/MenuItem";

export default function HostProfileScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { setViewMode } = useViewMode();

  const fetchUserIfToken = useCallback(async () => {
    setLoading(true);
    const token = await SecureStore.getItemAsync("accessToken");
    if (token) {
      try {
        const data = await userService.getProfile();
        setUser(data);
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
    await SecureStore.deleteItemAsync("viewMode");
    router.replace("/(auth)/login");
  };

  const switchToDriver = async () => {
    await setViewMode("driver");
    router.replace("/(tabs)");
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["left", "right"]}>
      <View style={styles.container}>
        <View style={styles.profileHeader}>
          {user?.profilePicture ? (
            <Image
              source={{ uri: user.profilePicture }}
              style={styles.avatar}
              contentFit="cover"
            />
          ) : (
            <View style={styles.avatar}>
              <MaterialIcons name="person" size={48} color="#fff" />
            </View>
          )}

          <View style={styles.profileInfo}>
            <Text style={styles.userName}>
              {loading
                ? "Loading..."
                : user
                  ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || "-"
                  : "-"}
            </Text>

            <View style={styles.hostBadge}>
              <MaterialIcons name="home-work" size={14} color="#fff" />
              <Text style={styles.badgeText}>Host</Text>
            </View>

            <TouchableOpacity
              style={styles.editProfileBtn}
              onPress={() => router.push("/(modals)/update-profile")}
              activeOpacity={0.8}
            >
              <MaterialIcons name="edit" size={14} color="#fff" />
              <Text style={styles.editProfileText}>Edit Profile</Text>
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
              balance={Number(user?.walletBalance ?? 0)}
              onTopUp={() => router.push("/(modals)/top-up")}
              onWithdraw={() => {}}
            />

            {/* Switch to Driver View */}
            <TouchableOpacity
              style={styles.switchButton}
              onPress={switchToDriver}
              activeOpacity={0.8}
            >
              <View style={styles.switchIconBg}>
                <MaterialIcons name="directions-car" size={20} color="#11796F" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.switchTitle}>Switch to Driver View</Text>
                <Text style={styles.switchSubtitle}>
                  Go back to finding parking
                </Text>
              </View>
              <MaterialIcons name="swap-horiz" size={22} color="#11796F" />
            </TouchableOpacity>

            <View style={styles.menuSection}>
              <Text style={styles.menuSectionTitle}>Account</Text>
              <View style={styles.menuCard}>
                <TouchableOpacity
                  style={styles.settingsItem}
                  onPress={() => setSettingsOpen((open) => !open)}
                  activeOpacity={0.7}
                >
                  <View style={styles.menuItemLeft}>
                    <View style={[styles.menuIconBg, { backgroundColor: "#F2F2F7" }]}>
                      <MaterialIcons name="settings" size={18} color="#8E8E93" />
                    </View>
                    <Text style={styles.menuItemLabel}>Settings</Text>
                  </View>
                  <MaterialIcons
                    name={settingsOpen ? "keyboard-arrow-up" : "keyboard-arrow-right"}
                    size={22}
                    color="#8E8E93"
                  />
                </TouchableOpacity>

                {settingsOpen && (
                  <View style={styles.settingsDropdown}>
                    <TouchableOpacity
                      style={styles.dropdownItem}
                      onPress={() => router.push("/(modals)/forgot-password")}
                      activeOpacity={0.7}
                    >
                      <MaterialIcons name="lock-reset" size={18} color="#8E8E93" />
                      <Text style={styles.dropdownText}>Forgot Password</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.dropdownItem}
                      onPress={() => router.push("/(modals)/change-password")}
                      activeOpacity={0.7}
                    >
                      <MaterialIcons name="vpn-key" size={18} color="#8E8E93" />
                      <Text style={styles.dropdownText}>Change Password</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <MenuItem label="Help & Support" icon="help-outline" iconBg="#E3F2FD" iconColor="#1976D2" />
              </View>
            </View>

            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
              activeOpacity={0.8}
            >
              <MaterialIcons name="logout" size={18} color="#E53935" />
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#11796F" },
  container: { flex: 1 },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 32,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 28,
    backgroundColor: "#038A7A",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.2)",
  },
  profileInfo: { flex: 1 },
  userName: {
    fontSize: 22,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -0.3,
  },
  hostBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginTop: 6,
  },
  badgeText: { fontSize: 12, fontWeight: "600", color: "#fff" },
  editProfileBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
    backgroundColor: "#038A7A",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignSelf: "flex-start",
  },
  editProfileText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  menuWrapper: {
    flex: 1,
    backgroundColor: "#F8FAFB",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  scrollContent: { padding: 20, paddingBottom: 40, gap: 16 },
  switchButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#E8F5F3",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: "#11796F",
  },
  switchIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  switchTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#11796F",
  },
  switchSubtitle: {
    fontSize: 12,
    color: "#8E8E93",
    marginTop: 2,
  },
  menuSection: { gap: 10 },
  menuSectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#8E8E93",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginLeft: 4,
  },
  menuCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  settingsItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  menuItemLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  menuIconBg: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  menuItemLabel: { fontSize: 15, fontWeight: "600", color: "#1A1A2E" },
  settingsDropdown: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 2,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 44,
  },
  dropdownText: { fontSize: 14, color: "#555" },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FEE8E7",
    paddingVertical: 16,
    borderRadius: 14,
  },
  logoutText: {
    color: "#E53935",
    fontSize: 16,
    fontWeight: "700",
  },
});
