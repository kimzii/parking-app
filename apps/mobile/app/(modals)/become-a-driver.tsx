import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { authService } from "../../src/services/auth";
import { useViewMode } from "../../src/contexts/ViewModeContext";

const BENEFITS = [
  {
    icon: "directions-car" as const,
    title: "Find Parking Easily",
    description:
      "Browse nearby parking spots on the map and book them instantly.",
  },
  {
    icon: "navigation" as const,
    title: "Get Directions",
    description:
      "Navigate directly to your booked parking spot with built-in directions.",
  },
  {
    icon: "verified-user" as const,
    title: "Verified & Trusted",
    description:
      "Once verified, unlock full access to bookings, payments, and more.",
  },
];

export default function BecomeADriverModal() {
  const [loading, setLoading] = useState(false);
  const { setViewMode } = useViewMode();

  const handleBecomeDriver = async () => {
    setLoading(true);
    try {
      await authService.selectRole("DRIVER");
      Alert.alert(
        "Driver Role Added",
        "You can now verify your license to unlock all driver features.",
        [
          {
            text: "Verify Now",
            onPress: () =>
              router.replace("/(modals)/driver-verification"),
          },
          {
            text: "Later",
            style: "cancel",
            onPress: async () => {
              await setViewMode("driver");
              router.replace("/(tabs)");
            },
          },
        ],
      );
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        "Failed to register as driver. Please try again.";
      Alert.alert("Error", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["left", "right", "bottom"]}>
      <View style={styles.container}>
        {/* Hero */}
        <View style={styles.heroSection}>
          <View style={styles.heroIconBg}>
            <MaterialIcons name="directions-car" size={56} color="#D4501E" />
          </View>
          <Text style={styles.heroTitle}>Become a Driver</Text>
          <Text style={styles.heroSubtitle}>
            Find and book parking spots near you with just a few taps.
          </Text>
        </View>

        {/* Benefits */}
        <View style={styles.benefitsList}>
          {BENEFITS.map((benefit) => (
            <View key={benefit.title} style={styles.benefitItem}>
              <View style={styles.benefitIconBg}>
                <MaterialIcons name={benefit.icon} size={22} color="#D4501E" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.benefitTitle}>{benefit.title}</Text>
                <Text style={styles.benefitText}>{benefit.description}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Bottom */}
        <View style={styles.bottomSection}>
          <TouchableOpacity
            style={[styles.startButton, loading && styles.startButtonDisabled]}
            onPress={handleBecomeDriver}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <MaterialIcons name="rocket-launch" size={22} color="#fff" />
                <Text style={styles.startButtonText}>Start Driving</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  container: {
    flex: 1,
    justifyContent: "space-between",
  },
  heroSection: {
    alignItems: "center",
    paddingTop: 40,
    paddingHorizontal: 32,
  },
  heroIconBg: {
    width: 104,
    height: 104,
    borderRadius: 32,
    backgroundColor: "#FFF0EC",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#232230",
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  heroSubtitle: {
    fontSize: 15,
    color: "#A09A94",
    textAlign: "center",
    lineHeight: 22,
  },
  benefitsList: {
    paddingHorizontal: 24,
    gap: 14,
  },
  benefitItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  benefitIconBg: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#FFF0EC",
    justifyContent: "center",
    alignItems: "center",
  },
  benefitTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#232230",
    marginBottom: 4,
  },
  benefitText: {
    fontSize: 13,
    color: "#A09A94",
    lineHeight: 18,
  },
  bottomSection: {
    padding: 24,
    paddingBottom: 16,
  },
  startButton: {
    backgroundColor: "#D4501E",
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#D4501E",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  startButtonDisabled: {
    backgroundColor: "#B0BEC5",
    shadowOpacity: 0,
    elevation: 0,
  },
  startButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },
});
