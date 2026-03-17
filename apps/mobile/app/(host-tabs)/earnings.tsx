import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Alert,
  TextInput,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
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

export default function EarningsScreen() {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);

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

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount < 1) {
      Alert.alert(
        "Invalid Amount",
        "Please enter a valid amount (minimum ₱1).",
      );
      return;
    }
    if (amount > balance) {
      Alert.alert(
        "Insufficient Balance",
        `You can withdraw up to ₱${balance.toFixed(2)}.`,
      );
      return;
    }
    setWithdrawing(true);
    try {
      await walletService.withdraw(amount);
      setShowWithdraw(false);
      setWithdrawAmount("");
      await fetchData();
      Alert.alert("Success", `₱${amount.toFixed(2)} has been withdrawn.`);
    } catch {
      Alert.alert("Error", "Withdrawal failed. Please try again.");
    } finally {
      setWithdrawing(false);
    }
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
        <TouchableOpacity
          style={styles.withdrawBtn}
          onPress={() => setShowWithdraw(true)}
          activeOpacity={0.8}
        >
          <MaterialIcons name="account-balance" size={18} color="#fff" />
          <Text style={styles.withdrawBtnText}>Withdraw</Text>
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
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
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

      {/* Withdraw Modal */}
      <Modal
        visible={showWithdraw}
        animationType="slide"
        transparent
        onRequestClose={() => setShowWithdraw(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Withdraw Funds</Text>
              <TouchableOpacity onPress={() => setShowWithdraw(false)}>
                <MaterialIcons name="close" size={24} color="#8E8E93" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalBalance}>
              Available: ₱{balance.toFixed(2)}
            </Text>
            <View style={styles.inputRow}>
              <Text style={styles.currencySymbol}>₱</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="0.00"
                placeholderTextColor="#C7C7CC"
                keyboardType="decimal-pad"
                value={withdrawAmount}
                onChangeText={setWithdrawAmount}
                autoFocus
              />
            </View>
            <TouchableOpacity
              style={[styles.modalWithdrawBtn, withdrawing && { opacity: 0.6 }]}
              onPress={handleWithdraw}
              activeOpacity={0.8}
              disabled={withdrawing}
            >
              {withdrawing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.modalWithdrawBtnText}>Withdraw</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  listContent: {
    padding: 20,
    paddingBottom: 40,
    gap: 10,
  },

  // Balance Card
  balanceCard: {
    backgroundColor: "#11796F",
    borderRadius: 20,
    padding: 24,
    marginBottom: 6,
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
  withdrawBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 16,
    alignSelf: "flex-start",
  },
  withdrawBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },

  // Section
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

  // Transaction Card
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

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1A1A2E",
  },
  modalBalance: {
    fontSize: 14,
    color: "#8E8E93",
    marginBottom: 20,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFB",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: "700",
    color: "#11796F",
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: "700",
    color: "#1A1A2E",
    padding: 0,
  },
  modalWithdrawBtn: {
    backgroundColor: "#11796F",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  modalWithdrawBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
});
