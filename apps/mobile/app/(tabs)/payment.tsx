import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { walletService } from "../../src/services/wallet";

export default function PaymentScreen() {
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBalance = useCallback(async () => {
    try {
      const data = await walletService.getBalance();
      setBalance(Number(data.balance ?? 0));
    } catch (err) {
      console.error("Failed to fetch balance:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchBalance();
    }, [fetchBalance]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchBalance();
  };

  const quickActions = [
    {
      id: "top-up",
      label: "Top Up",
      icon: "add-circle-outline" as const,
      color: "#11796F",
      bg: "#E8F5F3",
      onPress: () => router.push("/(modals)/top-up"),
    },
    {
      id: "history",
      label: "History",
      icon: "receipt-long" as const,
      color: "#F57C00",
      bg: "#FFF3E0",
      onPress: () => {},
    },
    {
      id: "withdraw",
      label: "Withdraw",
      icon: "account-balance" as const,
      color: "#1976D2",
      bg: "#E3F2FD",
      onPress: () => {},
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={["left", "right"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Payment</Text>
        <Text style={styles.headerSubtitle}>Manage your wallet</Text>
      </View>

      <View style={styles.content}>
        <FlatList
          data={[]}
          keyExtractor={() => ""}
          renderItem={null}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#11796F"
            />
          }
          ListHeaderComponent={
            <>
              {/* Balance Card */}
              <View style={styles.balanceCard}>
                <Text style={styles.balanceLabel}>Available Balance</Text>
                {loading ? (
                  <ActivityIndicator
                    size="small"
                    color="#11796F"
                    style={{ marginVertical: 8 }}
                  />
                ) : (
                  <Text style={styles.balanceAmount}>
                    ₱{balance.toFixed(2)}
                  </Text>
                )}
                <TouchableOpacity
                  style={styles.topUpButton}
                  onPress={() => router.push("/(modals)/top-up")}
                  activeOpacity={0.8}
                >
                  <MaterialIcons name="add" size={18} color="#fff" />
                  <Text style={styles.topUpButtonText}>Top Up</Text>
                </TouchableOpacity>
              </View>

              {/* Quick Actions */}
              <Text style={styles.sectionTitle}>Quick Actions</Text>
              <View style={styles.actionsRow}>
                {quickActions.map((action) => (
                  <TouchableOpacity
                    key={action.id}
                    style={styles.actionCard}
                    onPress={action.onPress}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.actionIcon,
                        { backgroundColor: action.bg },
                      ]}
                    >
                      <MaterialIcons
                        name={action.icon}
                        size={24}
                        color={action.color}
                      />
                    </View>
                    <Text style={styles.actionLabel}>{action.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Recent Transactions Placeholder */}
              <Text style={styles.sectionTitle}>Recent Transactions</Text>
              <View style={styles.emptyState}>
                <View style={styles.emptyIconBg}>
                  <MaterialIcons
                    name="receipt-long"
                    size={36}
                    color="#11796F"
                  />
                </View>
                <Text style={styles.emptyTitle}>No transactions yet</Text>
                <Text style={styles.emptySubtitle}>
                  Your payment history will appear here
                </Text>
              </View>
            </>
          }
        />
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
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },
  balanceLabel: {
    fontSize: 14,
    color: "#8E8E93",
    fontWeight: "500",
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: "800",
    color: "#1A1A2E",
    letterSpacing: -0.5,
    marginVertical: 8,
  },
  topUpButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#11796F",
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 4,
  },
  topUpButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A2E",
  },
  actionsRow: {
    flexDirection: "row",
    gap: 12,
  },
  actionCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  actionLabel: { fontSize: 13, fontWeight: "600", color: "#1A1A2E" },
  emptyState: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyIconBg: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: "#E8F5F3",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A2E",
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#8E8E93",
    textAlign: "center",
  },
});
