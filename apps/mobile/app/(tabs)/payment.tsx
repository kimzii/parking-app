import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { walletService, Transaction } from "../../src/services/wallet";
import { userService } from "../../src/services/user";
import { useSocketEvent } from "../../src/hooks/useSocket";
import { getMyReservations, settleRemainingDue, Reservation } from "../../src/services/reservations";

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

export default function PaymentScreen() {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isDriverVerified, setIsDriverVerified] = useState(true);
  const [pendingPayment, setPendingPayment] = useState<Reservation | null>(null);
  const [settling, setSettling] = useState(false);

  // Real-time: refresh balance & transactions when a notification arrives (e.g. top-up approved)
  useSocketEvent("balance-update", (data: { balance: string }) => {
    setBalance(Number(data.balance));
  });
  useSocketEvent("notification", () => {
    fetchData();
  });

  const fetchData = useCallback(async () => {
    try {
      const [balanceData, profile, txns, reservations] = await Promise.all([
        walletService.getBalance(),
        userService.getProfile(),
        walletService.getTransactions(20),
        getMyReservations("PAYMENT_PENDING").catch(() => [] as Reservation[]),
      ]);
      setBalance(Number(balanceData.balance ?? 0));
      setTransactions(txns);
      const verified =
        profile.roleStatuses?.some(
          (rs: { role: string; status: string }) =>
            rs.role === "DRIVER" && rs.status === "VERIFIED",
        ) ?? false;
      setIsDriverVerified(verified);
      setPendingPayment(reservations.length > 0 ? reservations[0] : null);
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

  const handleSettle = async () => {
    if (!pendingPayment) return;
    if (balance < (pendingPayment.remainingDue ?? 0)) {
      Alert.alert(
        "Insufficient Balance",
        `You need ₱${(pendingPayment.remainingDue ?? 0).toFixed(2)} to settle this. Please top up first.`,
        [{ text: "OK" }],
      );
      return;
    }
    Alert.alert(
      "Settle Outstanding Balance",
      `Pay ₱${(pendingPayment.remainingDue ?? 0).toFixed(2)} from your wallet to complete this booking?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Settle Now",
          onPress: async () => {
            setSettling(true);
            try {
              await settleRemainingDue(pendingPayment.id);
              Alert.alert("Done", "Outstanding balance settled. Booking is now complete.");
              fetchData();
            } catch (err: any) {
              Alert.alert("Failed", err?.response?.data?.message ?? "Could not settle payment.");
            } finally {
              setSettling(false);
            }
          },
        },
      ],
    );
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
          <MaterialIcons name="lock" size={20} color="#D4501E" />
          <View style={{ flex: 1 }}>
            <Text style={styles.verifyBannerTitle}>
              Verify to unlock payments
            </Text>
            <Text style={styles.verifyBannerText}>
              Top-up and transactions require driver verification.
            </Text>
          </View>
          <MaterialIcons name="chevron-right" size={22} color="#D4501E" />
        </TouchableOpacity>
      )}

      {/* Outstanding Balance Banner */}
      {pendingPayment && (
        <View style={styles.debtBanner}>
          <MaterialIcons name="warning" size={20} color="#E53935" />
          <View style={{ flex: 1 }}>
            <Text style={styles.debtBannerTitle}>Outstanding Balance</Text>
            <Text style={styles.debtBannerText}>
              You owe ₱{(pendingPayment.remainingDue ?? 0).toFixed(2)} from your last session.
              Settle this to unlock new bookings.
            </Text>
          </View>
          <TouchableOpacity
            style={styles.settleBt}
            onPress={handleSettle}
            disabled={settling}
            activeOpacity={0.8}
          >
            {settling ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.settleBtText}>Pay</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Balance Card */}
      <View style={styles.balanceCard}>
        <View style={styles.balanceIconRow}>
          <View style={styles.walletIconBg}>
            <MaterialIcons name="account-balance-wallet" size={24} color="#fff" />
          </View>
          <Text style={styles.balanceLabel}>Available Balance</Text>
        </View>
        {loading ? (
          <ActivityIndicator
            size="small"
            color="#fff"
            style={{ marginTop: 8 }}
          />
        ) : (
          <Text style={styles.balanceAmount}>₱ {balance.toFixed(2)}</Text>
        )}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() =>
              isDriverVerified
                ? router.push("/(modals)/top-up" as any)
                : router.push("/(modals)/driver-verification")
            }
            activeOpacity={0.8}
          >
            <MaterialIcons name="add" size={18} color="#fff" />
            <Text style={styles.actionBtnText}>Top Up</Text>
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
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
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
  scrollContent: {
    padding: 20,
    paddingBottom: 32,
    gap: 10,
  },
  balanceCard: {
    backgroundColor: "#D4501E",
    borderRadius: 20,
    padding: 24,
    shadowColor: "#D4501E",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 6,
    marginBottom: 6,
  },
  balanceIconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 4,
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
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
    fontWeight: "500",
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -0.5,
    marginVertical: 8,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  actionBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
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
    fontSize: 16,
    fontWeight: "700",
    color: "#232230",
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#A09A94",
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
    borderColor: "#D4501E",
  },
  verifyBannerTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#D4501E",
  },
  verifyBannerText: {
    fontSize: 12,
    color: "#A09A94",
    marginTop: 2,
  },
  debtBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFEBEE",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E53935",
    padding: 14,
    marginHorizontal: 20,
    marginBottom: 12,
  },
  debtBannerTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#E53935",
  },
  debtBannerText: {
    fontSize: 12,
    color: "#B71C1C",
    marginTop: 2,
  },
  settleBt: {
    backgroundColor: "#E53935",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 48,
    alignItems: "center",
  },
  settleBtText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },
});
