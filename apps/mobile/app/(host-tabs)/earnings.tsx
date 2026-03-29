import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { walletService, Transaction } from "../../src/services/wallet";

const SOURCE_CONFIG: Record<
  string,
  { label: string; icon: string; color: string; bg: string }
> = {
  TOP_UP: {
    label: "Top Up",
    icon: "add-circle",
    color: "#4CAF50",
    bg: "#F5F4F2",
  },
  RESERVATION_PAYMENT: {
    label: "Booking Payment",
    icon: "local-parking",
    color: "#D4501E",
    bg: "#FFF0EC",
  },
  REFUND: {
    label: "Refund",
    icon: "replay",
    color: "#D4501E",
    bg: "#FFF0EC",
  },
  HOST_PAYOUT: {
    label: "Withdrawal",
    icon: "account-balance",
    color: "#1976D2",
    bg: "#E3F2FD",
  },
  ADMIN_ADJUSTMENT: {
    label: "Adjustment",
    icon: "tune",
    color: "#A09A94",
    bg: "#F5F5F5",
  },
};

export default function EarningsScreen() {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [balanceData, txns] = await Promise.all([
        walletService.getBalance(),
        walletService.getTransactions(20),
      ]);
      setBalance(parseFloat(balanceData.balance));
      setTransactions(txns);
    } catch (err) {
      console.error("Failed to fetch earnings data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchData();
    }, [fetchData]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const renderTransaction = ({ item }: { item: Transaction }) => {
    const config = SOURCE_CONFIG[item.source] ?? SOURCE_CONFIG.ADMIN_ADJUSTMENT;
    const isCredit = item.type === "CREDIT";
    const amount = Number(item.amount);
    const date = new Date(item.createdAt);

    return (
      <View style={styles.txnCard}>
        <View style={[styles.txnIconBg, { backgroundColor: config.bg }]}>
          <MaterialIcons
            name={config.icon as any}
            size={20}
            color={config.color}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.txnLabel}>{config.label}</Text>
          <Text style={styles.txnDate}>
            {date.toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })}{" "}
            •{" "}
            {date.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            })}
          </Text>
        </View>
        <Text
          style={[
            styles.txnAmount,
            { color: isCredit ? "#4CAF50" : "#E53935" },
          ]}
        >
          {isCredit ? "+" : "-"}₱{amount.toFixed(2)}
        </Text>
      </View>
    );
  };

  const renderHeader = () => (
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
        <Text style={styles.balanceAmount}>₱{balance.toFixed(2)}</Text>
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => router.push("/(modals)/withdraw")}
            activeOpacity={0.8}
          >
            <MaterialIcons name="account-balance" size={18} color="#fff" />
            <Text style={styles.actionBtnText}>Withdraw</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Recent Transactions Title */}
      <Text style={styles.sectionTitle}>Recent Transactions</Text>
    </>
  );

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconBg}>
        <MaterialIcons name="receipt-long" size={36} color="#D4501E" />
      </View>
      <Text style={styles.emptyTitle}>No transactions yet</Text>
      <Text style={styles.emptySubtitle}>
        Earnings from bookings and withdrawals will appear here
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Earnings</Text>
        <Text style={styles.headerSubtitle}>Track your hosting income</Text>
      </View>

      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator
            size="large"
            color="#D4501E"
            style={{ marginTop: 40 }}
          />
        ) : (
          <FlatList
            data={transactions}
            keyExtractor={(item) => item.id}
            renderItem={renderTransaction}
            ListHeaderComponent={renderHeader}
            ListEmptyComponent={renderEmpty}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#D4501E"
              />
            }
          />
        )}
      </View>

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
    fontSize: 24,
    fontWeight: "800",
    color: "#232230",
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#A09A94",
    fontWeight: "500",
    marginTop: 4,
  },
  content: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  listContent: {
    padding: 20,
    paddingBottom: 40,
    gap: 12,
  },

  // Balance Card
  balanceCard: {
    backgroundColor: "#D4501E",
    borderRadius: 20,
    padding: 24,
    marginBottom: 6,
    shadowColor: "#D4501E",
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
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingVertical: 10,
    borderRadius: 12,
  },
  actionBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },

  // Section
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#A09A94",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginLeft: 4,
    marginTop: 10,
    marginBottom: 2,
  },

  // Transaction Card
  txnCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  txnIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  txnLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#232230",
  },
  txnDate: {
    fontSize: 12,
    color: "#A09A94",
    marginTop: 2,
  },
  txnAmount: {
    fontSize: 15,
    fontWeight: "700",
  },

  // Empty State
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
    backgroundColor: "#FFF0EC",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#232230",
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#A09A94",
    textAlign: "center",
  },

});
