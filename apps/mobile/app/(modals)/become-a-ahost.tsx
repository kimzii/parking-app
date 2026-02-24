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
import { hostService } from "../../src/services/hosts";
import { useViewMode } from "../../src/contexts/ViewModeContext";

const BENEFITS = [
  {
    icon: "payments" as const,
    title: "Earn Passive Income",
    description: "Turn your unused parking space into a steady revenue stream.",
  },
  {
    icon: "schedule" as const,
    title: "Flexible Schedule",
    description: "Set your own availability and pricing for your parking spots.",
  },
  {
    icon: "shield" as const,
    title: "Secure Transactions",
    description: "All payments are handled securely through the app's wallet system.",
  },
];

export default function BecomeAHostModal() {
  const [loading, setLoading] = useState(false);
  const { setViewMode } = useViewMode();

  const handleBecomeHost = async () => {
    setLoading(true);
    try {
      await hostService.becomeHost();
      await setViewMode("host");
      router.replace("/(host-tabs)");
    } catch (err: any) {
      const message =
        err?.response?.data?.message || "Failed to register as host. Please try again.";
      Alert.alert("Error", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
      <View style={styles.container}>
        {/* Hero */}
        <View style={styles.heroSection}>
          <View style={styles.heroIconBg}>
            <MaterialIcons name="home-work" size={56} color="#11796F" />
          </View>
          <Text style={styles.heroTitle}>Become a Host</Text>
          <Text style={styles.heroSubtitle}>
            List your parking space and start earning from drivers in your area.
          </Text>
        </View>

        {/* Benefits */}
        <View style={styles.benefitsList}>
          {BENEFITS.map((benefit) => (
            <View key={benefit.title} style={styles.benefitItem}>
              <View style={styles.benefitIconBg}>
                <MaterialIcons name={benefit.icon} size={22} color="#11796F" />
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
            onPress={handleBecomeHost}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <MaterialIcons name="rocket-launch" size={22} color="#fff" />
                <Text style={styles.startButtonText}>Start Hosting</Text>
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
    backgroundColor: "#F8FAFB",
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
    backgroundColor: "#E8F5F3",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1A1A2E",
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  heroSubtitle: {
    fontSize: 15,
    color: "#8E8E93",
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
    backgroundColor: "#E8F5F3",
    justifyContent: "center",
    alignItems: "center",
  },
  benefitTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1A1A2E",
    marginBottom: 4,
  },
  benefitText: {
    fontSize: 13,
    color: "#8E8E93",
    lineHeight: 18,
  },
  bottomSection: {
    padding: 24,
    paddingBottom: 16,
  },
  startButton: {
    backgroundColor: "#11796F",
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#11796F",
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
