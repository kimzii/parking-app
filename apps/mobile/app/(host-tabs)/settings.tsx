import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import LegalModal, { LegalTab } from "../../src/components/LegalModal";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { MaterialIcons } from "@expo/vector-icons";

import { authService } from "../../src/services/auth";
import { userService } from "../../src/services/user";
import { User } from "../../src/types/user";
import { useViewMode } from "../../src/contexts/ViewModeContext";

export default function HostSettingsScreen() {
  const [user, setUser] = useState<User | null>(null);
  const { setViewMode } = useViewMode();
  const [legalModalVisible, setLegalModalVisible] = useState(false);
  const [legalTab, setLegalTab] = useState<LegalTab>("terms");

  const openLegal = (tab: LegalTab) => {
    setLegalTab(tab);
    setLegalModalVisible(true);
  };

  const fetchUser = useCallback(async () => {
    const token = await SecureStore.getItemAsync("accessToken");
    if (token) {
      try {
        const data = await userService.getProfile();
        setUser(data);
      } catch {}
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchUser(); }, [fetchUser]));

  const handleLogout = async () => {
    await authService.logout();
    await SecureStore.deleteItemAsync("viewMode");
    router.replace("/(auth)/login");
  };

  const switchToDriver = async () => {
    await setViewMode("driver");
    router.replace("/(tabs)");
  };

  const hasDriverRole =
    user?.roleStatuses?.some((rs) => rs.role === "DRIVER") ?? false;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* View mode */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>View</Text>
          <View style={styles.card}>
            {hasDriverRole ? (
              <TouchableOpacity
                style={styles.switchRow}
                onPress={switchToDriver}
                activeOpacity={0.75}
              >
                <View style={styles.switchIconBg}>
                  <MaterialIcons name="directions-car" size={20} color="#D4501E" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.switchTitle}>Switch to Driver View</Text>
                  <Text style={styles.switchSubtitle}>
                    Book and manage your parking
                  </Text>
                </View>
                <MaterialIcons name="swap-horiz" size={22} color="#D4501E" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.switchRow}
                onPress={() => router.push("/(modals)/become-a-driver")}
                activeOpacity={0.75}
              >
                <View style={styles.switchIconBg}>
                  <MaterialIcons name="directions-car" size={20} color="#D4501E" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.switchTitle}>Become a Driver</Text>
                  <Text style={styles.switchSubtitle}>
                    Register to book parking spaces
                  </Text>
                </View>
                <MaterialIcons name="chevron-right" size={22} color="#D4501E" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* App settings */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>App</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => router.push("/(modals)/change-password")}
              activeOpacity={0.75}
            >
              <View style={styles.menuIconBg}>
                <MaterialIcons name="vpn-key" size={18} color="#A09A94" />
              </View>
              <Text style={styles.menuLabel}>Change Password</Text>
              <MaterialIcons name="chevron-right" size={22} color="#D1D1CF" />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.menuRow} activeOpacity={0.75}>
              <View style={styles.menuIconBg}>
                <MaterialIcons name="help-outline" size={18} color="#A09A94" />
              </View>
              <Text style={styles.menuLabel}>Help & Support</Text>
              <MaterialIcons name="chevron-right" size={22} color="#D1D1CF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Legal */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Legal</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => openLegal("terms")}
              activeOpacity={0.75}
            >
              <View style={styles.menuIconBg}>
                <MaterialIcons name="description" size={18} color="#A09A94" />
              </View>
              <Text style={styles.menuLabel}>Terms and Conditions</Text>
              <MaterialIcons name="chevron-right" size={22} color="#D1D1CF" />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => openLegal("privacy")}
              activeOpacity={0.75}
            >
              <View style={styles.menuIconBg}>
                <MaterialIcons name="privacy-tip" size={18} color="#A09A94" />
              </View>
              <Text style={styles.menuLabel}>Data Privacy Policy</Text>
              <MaterialIcons name="chevron-right" size={22} color="#D1D1CF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <MaterialIcons name="logout" size={18} color="#E53935" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>

      <LegalModal
        visible={legalModalVisible}
        initialTab={legalTab}
        onClose={() => setLegalModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#FFFFFF" },
  header: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#232230",
    letterSpacing: -0.5,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 24,
  },
  section: {
    gap: 10,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#A09A94",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#F0EDE8",
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
  },
  switchIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#FFF0EC",
    justifyContent: "center",
    alignItems: "center",
  },
  switchTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#232230",
  },
  switchSubtitle: {
    fontSize: 12,
    color: "#A09A94",
    marginTop: 2,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  menuIconBg: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#F5F4F2",
    justifyContent: "center",
    alignItems: "center",
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#232230",
  },
  divider: {
    height: 1,
    backgroundColor: "#F0EDE8",
    marginLeft: 62,
  },
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
