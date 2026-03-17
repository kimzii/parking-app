import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { walletService } from "../../src/services/wallet";

const PRESET_AMOUNTS = [50, 100, 200, 500, 1000, 2000];

export default function TopUpScreen() {
  const [amount, setAmount] = useState("");
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [fetchingBalance, setFetchingBalance] = useState(true);

  useEffect(() => {
    fetchBalance();
  }, []);

  const fetchBalance = async () => {
    try {
      const data = await walletService.getBalance();
      setBalance(parseFloat(data.balance));
    } catch {
      console.error("Failed to fetch balance");
    } finally {
      setFetchingBalance(false);
    }
  };

  const handlePresetSelect = (value: number) => {
    setAmount(value.toString());
  };

  const handleTopUp = async () => {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount < 1) {
      Alert.alert("Invalid Amount", "Please enter an amount of at least ₱1.");
      return;
    }

    setLoading(true);
    try {
      const result = await walletService.topUp(numAmount);
      setBalance(parseFloat(result.wallet.balance));
      setAmount("");
      Alert.alert(
        "Top Up Successful",
        `₱${numAmount.toFixed(2)} has been added to your wallet.`,
        [{ text: "OK", onPress: () => router.back() }],
      );
    } catch {
      Alert.alert("Top Up Failed", "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["left", "right", "bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Balance Card */}
          <View style={styles.balanceCard}>
            <View style={styles.balanceIconRow}>
              <View style={styles.walletIconBg}>
                <MaterialIcons name="account-balance-wallet" size={24} color="#fff" />
              </View>
              <Text style={styles.balanceLabel}>Current Balance</Text>
            </View>
            {fetchingBalance ? (
              <ActivityIndicator size="small" color="#fff" style={{ marginTop: 8 }} />
            ) : (
              <Text style={styles.balanceAmount}>₱ {balance.toFixed(2)}</Text>
            )}
          </View>

          {/* Amount Input */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Enter Amount</Text>
            <View style={styles.inputCard}>
              <View style={styles.inputRow}>
                <Text style={styles.currencySymbol}>₱</Text>
                <TextInput
                  style={styles.amountInput}
                  placeholder="0.00"
                  placeholderTextColor="#C7C7CC"
                  keyboardType="numeric"
                  value={amount}
                  onChangeText={setAmount}
                />
              </View>
            </View>
          </View>

          {/* Preset Amounts */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Select</Text>
            <View style={styles.presetGrid}>
              {PRESET_AMOUNTS.map((preset) => {
                const isSelected = amount === preset.toString();
                return (
                  <TouchableOpacity
                    key={preset}
                    style={[styles.presetButton, isSelected && styles.presetButtonSelected]}
                    onPress={() => handlePresetSelect(preset)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.presetText, isSelected && styles.presetTextSelected]}>
                      ₱{preset.toLocaleString()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Simulation Notice */}
          <View style={styles.noticeCard}>
            <MaterialIcons name="info-outline" size={18} color="#F57C00" />
            <Text style={styles.noticeText}>
              This is a simulated top-up. No real payment will be processed.
            </Text>
          </View>
        </ScrollView>

        {/* Bottom Button */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[styles.topUpButton, (!amount || loading) && styles.topUpButtonDisabled]}
            onPress={handleTopUp}
            disabled={!amount || loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <MaterialIcons name="add-circle" size={22} color="#fff" />
                <Text style={styles.topUpButtonText}>
                  Top Up{amount ? ` ₱${parseFloat(amount).toLocaleString()}` : ""}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFB",
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 16,
    gap: 20,
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
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#8E8E93",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginLeft: 4,
  },
  inputCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  currencySymbol: {
    fontSize: 28,
    fontWeight: "800",
    color: "#11796F",
  },
  amountInput: {
    flex: 1,
    fontSize: 28,
    fontWeight: "800",
    color: "#1A1A2E",
    padding: 0,
  },
  presetGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  presetButton: {
    width: "31%",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#E8ECF0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  presetButtonSelected: {
    backgroundColor: "#E8F5F3",
    borderColor: "#11796F",
  },
  presetText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1A1A2E",
  },
  presetTextSelected: {
    color: "#11796F",
  },
  noticeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFF8E1",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#FFE0B2",
  },
  noticeText: {
    flex: 1,
    fontSize: 13,
    color: "#F57C00",
    fontWeight: "500",
    lineHeight: 18,
  },
  bottomBar: {
    padding: 20,
    paddingTop: 12,
    backgroundColor: "#F8FAFB",
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  topUpButton: {
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
  topUpButtonDisabled: {
    backgroundColor: "#B0BEC5",
    shadowOpacity: 0,
    elevation: 0,
  },
  topUpButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },
});
