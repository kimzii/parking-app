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
import { walletService } from "../../src/services/wallet";

export default function EarningsScreen() {
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      const fetchBalance = async () => {
        setLoading(true);
        try {
          const data = await walletService.getBalance();
          setBalance(parseFloat(data.balance));
        } catch (err) {
          console.error("Failed to fetch balance:", err);
        } finally {
          setLoading(false);
        }
      };
      fetchBalance();
    }, []),
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["left", "right"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Earnings</Text>
        <Text style={styles.headerSubtitle}>Track your hosting income</Text>
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
              {/* Balance Card */}
              <View style={styles.balanceCard}>
                <View style={styles.balanceIconRow}>
                  <View style={styles.walletIconBg}>
                    <MaterialIcons
                      name="account-balance-wallet"
                      size={24}
                      color="#fff"
                    />
                  </View>
                  <Text style={styles.balanceLabel}>Wallet Balance</Text>
                </View>
                <Text style={styles.balanceAmount}>
                  ₱ {balance.toFixed(2)}
                </Text>
              </View>

              {/* Coming Soon */}
              <View style={styles.comingSoonCard}>
                <View style={styles.comingSoonIconBg}>
                  <MaterialIcons name="bar-chart" size={48} color="#11796F" />
                </View>
                <Text style={styles.comingSoonTitle}>
                  Earnings Dashboard Coming Soon
                </Text>
                <Text style={styles.comingSoonText}>
                  Revenue charts, payout history, and detailed analytics will be
                  available here once reservations are active.
                </Text>
              </View>

              {/* Info Cards */}
              <Text style={styles.sectionTitle}>How Earnings Work</Text>
              <View style={styles.infoCard}>
                <View style={[styles.infoIconBg, { backgroundColor: "#E8F5F3" }]}>
                  <MaterialIcons name="local-parking" size={20} color="#11796F" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoTitle}>Drivers book your space</Text>
                  <Text style={styles.infoText}>
                    Once your parking location is approved, drivers can reserve
                    and pay for spots.
                  </Text>
                </View>
              </View>
              <View style={styles.infoCard}>
                <View style={[styles.infoIconBg, { backgroundColor: "#E8F5E9" }]}>
                  <MaterialIcons name="payments" size={20} color="#4CAF50" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoTitle}>Earnings go to your wallet</Text>
                  <Text style={styles.infoText}>
                    Payments from reservations are credited to your wallet
                    automatically.
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
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 28,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
    fontWeight: "500",
    marginTop: 4,
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
    gap: 16,
  },
  balanceCard: {
    backgroundColor: "#11796F",
    borderRadius: 20,
    padding: 24,
    shadowColor: "#11796F",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  balanceIconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  walletIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  balanceLabel: {
    fontSize: 15,
    color: "rgba(255,255,255,0.7)",
    fontWeight: "600",
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: "800",
    color: "#fff",
    marginTop: 8,
    letterSpacing: -0.5,
  },
  comingSoonCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 28,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  comingSoonIconBg: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: "#E8F5F3",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  comingSoonTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A2E",
    marginBottom: 8,
    textAlign: "center",
  },
  comingSoonText: {
    fontSize: 14,
    color: "#8E8E93",
    textAlign: "center",
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#8E8E93",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginLeft: 4,
    marginTop: 4,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  infoIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1A1A2E",
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: "#8E8E93",
    lineHeight: 18,
  },
});
