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
import { walletService, Transaction } from "../../src/services/wallet";
import { userService } from "../../src/services/user";

const SOURCE_CONFIG: Record<
  string,
  { label: string; icon: string; color: string; bg: string }
> = {
  TOP_UP: {
    label: "Top Up",
    icon: "add-circle",
    color: "#4CAF50",
    bg: "#E8F5E9",
  },
  RESERVATION_PAYMENT: {
    label: "Booking Payment",
    icon: "local-parking",
    color: "#11796F",
    bg: "#E8F5F3",
  },
  REFUND: {
    label: "Refund",
    icon: "replay",
    color: "#F57C00",
    bg: "#FFF3E0",
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
    color: "#8E8E93",
    bg: "#F5F5F5",
  },
};

export default function PaymentScreen() {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isDriverVerified, setIsDriverVerified] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [balanceData, profile, txns] = await Promise.all([
        walletService.getBalance(),
        userService.getProfile(),
        walletService.getTransactions(30),
      ]);
      setBalance(Number(balanceData.balance ?? 0));
      setTransactions(txns);
      const verified =
        profile.roleStatuses?.some(
          (rs: { role: string; status: string }) =>
            rs.role === "DRIVER" && rs.status === "VERIFIED",
        ) ?? false;
      setIsDriverVerified(verified);
    } catch (err) {
      console.error("Failed to fetch payment data:", err);
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
      {/* Verification Warning */}
      {!isDriverVerified && (
        <TouchableOpacity
          style={styles.verifyBanner}
          onPress={() => router.push("/(modals)/driver-verification")}
          activeOpacity={0.8}
        >
          <MaterialIcons name="lock" size={20} color="#F57C00" />
          <View style={{ flex: 1 }}>
            <Text style={styles.verifyBannerTitle}>
              Verify to unlock payments
            </Text>
            <Text style={styles.verifyBannerText}>
              Top-up, withdraw, and transactions require driver verification.
            </Text>
          </View>
          <MaterialIcons name="chevron-right" size={22} color="#F57C00" />
        </TouchableOpacity>
      )}

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
          <Text style={styles.balanceAmount}>₱{balance.toFixed(2)}</Text>
        )}
        <TouchableOpacity
          style={[
            styles.topUpButton,
            !isDriverVerified && { backgroundColor: "#B0BEC5" },
          ]}
          onPress={() =>
            isDriverVerified
              ? router.push("/(modals)/top-up")
              : router.push("/(modals)/driver-verification")
          }
          activeOpacity={0.8}
        >
          <MaterialIcons name="add" size={18} color="#fff" />
          <Text style={styles.topUpButtonText}>Top Up</Text>
        </TouchableOpacity>
      </View>

      {/* Recent Transactions Title */}
      <Text style={styles.sectionTitle}>Recent Transactions</Text>
    </>
  );

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconBg}>
        <MaterialIcons name="receipt-long" size={36} color="#11796F" />
      </View>
      <Text style={styles.emptyTitle}>No transactions yet</Text>
      <Text style={styles.emptySubtitle}>
        Your payment history will appear here
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Payment</Text>
        <Text style={styles.headerSubtitle}>Manage your wallet</Text>
      </View>

      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator
            size="large"
            color="#11796F"
            style={{ marginTop: 40 }}
          />
        ) : (
          <FlatList
            data={transactions}
            keyExtractor={(item) => item.id}
            renderItem={renderTransaction}
            ListHeaderComponent={renderHeader}
            ListEmptyComponent={renderEmpty}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#11796F"
              />
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8FAFB" },
  header: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1A1A2E",
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#8E8E93",
    fontWeight: "500",
    marginTop: 4,
  },
  content: {
    flex: 1,
    backgroundColor: "#F8FAFB",
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 32,
    gap: 10,
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
    marginBottom: 6,
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
    fontSize: 13,
    fontWeight: "700",
    color: "#8E8E93",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginLeft: 4,
    marginTop: 10,
    marginBottom: 2,
  },
  txnCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
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
    color: "#1A1A2E",
  },
  txnDate: {
    fontSize: 12,
    color: "#8E8E93",
    marginTop: 2,
  },
  txnAmount: {
    fontSize: 15,
    fontWeight: "700",
  },
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
  verifyBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFF8E1",
    borderRadius: 16,
    padding: 16,
    marginBottom: 6,
    borderWidth: 1.5,
    borderColor: "#F57C00",
  },
  verifyBannerTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#F57C00",
  },
  verifyBannerText: {
    fontSize: 12,
    color: "#8E8E93",
    marginTop: 2,
  },
});
