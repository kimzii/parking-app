import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { hostService } from "../../src/services/hosts";
import { userService } from "../../src/services/user";

interface Stats {
  totalLocations: number;
  approvedLocations: number;
  pendingLocations: number;
  rejectedLocations: number;
}

export default function HostHomeScreen() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [userName, setUserName] = useState("");
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      const fetchData = async () => {
        setLoading(true);
        try {
          const [statsData, profile] = await Promise.all([
            hostService.getStatistics(),
            userService.getProfile(),
          ]);
          setStats(statsData);
          setUserName(
            `${profile.firstName ?? ""} ${profile.lastName ?? ""}`.trim() || "Host",
          );
        } catch (err) {
          console.error("Failed to fetch host data:", err);
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }, []),
  );

  const statCards = [
    {
      label: "Total Spaces",
      value: stats?.totalLocations ?? 0,
      icon: "location-on" as const,
      color: "#11796F",
      bg: "#E8F5F3",
    },
    {
      label: "Approved",
      value: stats?.approvedLocations ?? 0,
      icon: "check-circle" as const,
      color: "#4CAF50",
      bg: "#E8F5E9",
    },
    {
      label: "Pending",
      value: stats?.pendingLocations ?? 0,
      icon: "schedule" as const,
      color: "#F57C00",
      bg: "#FFF3E0",
    },
    {
      label: "Rejected",
      value: stats?.rejectedLocations ?? 0,
      icon: "cancel" as const,
      color: "#E53935",
      bg: "#FFEBEE",
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={["left", "right"]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.userName}>{userName}</Text>
        </View>
        <View style={styles.hostBadge}>
          <MaterialIcons name="home-work" size={16} color="#fff" />
          <Text style={styles.hostBadgeText}>Host</Text>
        </View>
      </View>

      <View style={styles.content}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {loading ? (
            <ActivityIndicator
              size="large"
              color="#11796F"
              style={{ marginTop: 40 }}
            />
          ) : (
            <>
              <Text style={styles.sectionTitle}>Overview</Text>
              <View style={styles.statsGrid}>
                {statCards.map((card) => (
                  <View key={card.label} style={styles.statCard}>
                    <View style={[styles.statIconBg, { backgroundColor: card.bg }]}>
                      <MaterialIcons name={card.icon} size={22} color={card.color} />
                    </View>
                    <Text style={styles.statValue}>{card.value}</Text>
                    <Text style={styles.statLabel}>{card.label}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.tipCard}>
                <MaterialIcons name="lightbulb-outline" size={22} color="#F57C00" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.tipTitle}>Get Started</Text>
                  <Text style={styles.tipText}>
                    Head to the Spaces tab to add your first parking location and start
                    earning.
                  </Text>
                </View>
              </View>
            </>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#11796F" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 28,
  },
  greeting: {
    fontSize: 15,
    color: "rgba(255,255,255,0.7)",
    fontWeight: "500",
  },
  userName: {
    fontSize: 24,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -0.3,
  },
  hostBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  hostBadgeText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#fff",
  },
  content: {
    flex: 1,
    backgroundColor: "#F8FAFB",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
    gap: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#8E8E93",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginLeft: 4,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statCard: {
    width: "47%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    gap: 8,
  },
  statIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  statValue: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1A1A2E",
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#8E8E93",
  },
  tipCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: "#FFF8E1",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#FFE0B2",
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#F57C00",
    marginBottom: 4,
  },
  tipText: {
    fontSize: 13,
    color: "#9E6D00",
    lineHeight: 18,
  },
});
