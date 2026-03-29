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
import { Stack, router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { walletService, WithdrawRequest } from "../../src/services/wallet";
import api from "../../src/services/api";

const PRESET_AMOUNTS = [100, 200, 500, 1000, 2000, 5000];

type Step = "amount" | "confirm" | "done";

export default function WithdrawScreen() {
  const [step, setStep] = useState<Step>("amount");
  const [amount, setAmount] = useState("");
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [fetchingBalance, setFetchingBalance] = useState(true);
  const [currentRequest, setCurrentRequest] = useState<WithdrawRequest | null>(null);
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    fetchBalance();
    fetchProfile();
    checkExistingRequest();
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

  const fetchProfile = async () => {
    try {
      const res = await api.get("/users/profile");
      setPhoneNumber(res.data.phoneNumber || null);
    } catch {
      console.error("Failed to fetch profile");
    } finally {
      setLoadingProfile(false);
    }
  };

  const checkExistingRequest = async () => {
    try {
      const requests = await walletService.getMyWithdrawRequests();
      // Only resume if PENDING — APPROVED/REJECTED means the flow is fully done
      const pending = requests.find((r) => r.status === "PENDING");
      if (pending) {
        setCurrentRequest(pending);
        setAmount(parseFloat(pending.amount).toString());
        setStep("done");
      }
    } catch {
      // No existing request
    }
  };

  const handlePresetSelect = (value: number) => {
    setAmount(value.toString());
  };

  const handleContinue = () => {
    if (!phoneNumber) {
      Alert.alert(
        "GCash Number Required",
        "Please add your GCash number to your profile before requesting a withdrawal. Your account phone number must be your GCash number.",
      );
      return;
    }

    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount < 1) {
      Alert.alert("Invalid Amount", "Please enter an amount of at least ₱1.");
      return;
    }
    if (numAmount > balance) {
      Alert.alert("Insufficient Balance", `You only have ₱${balance.toFixed(2)} available.`);
      return;
    }
    setStep("confirm");
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const request = await walletService.createWithdraw(parseFloat(amount));
      setCurrentRequest(request);
      setStep("done");
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Failed to create withdrawal request.";
      Alert.alert("Error", msg);
    } finally {
      setLoading(false);
    }
  };

  const renderAmountStep = () => (
    <>
      {/* Balance Card */}
      <View style={styles.balanceCard}>
        <View style={styles.balanceIconRow}>
          <View style={styles.walletIconBg}>
            <MaterialIcons name="account-balance-wallet" size={24} color="#fff" />
          </View>
          <Text style={styles.balanceLabel}>Available Balance</Text>
        </View>
        {fetchingBalance ? (
          <ActivityIndicator size="small" color="#fff" style={{ marginTop: 8 }} />
        ) : (
          <Text style={styles.balanceAmount}>₱ {balance.toFixed(2)}</Text>
        )}
      </View>

      {/* GCash Number Info */}
      <View style={[styles.gcashCard, !phoneNumber && styles.gcashCardWarning]}>
        <MaterialIcons
          name={phoneNumber ? "phone-android" : "warning"}
          size={22}
          color={phoneNumber ? "#005f56" : "#D4501E"}
        />
        <View style={{ flex: 1 }}>
          <Text style={[styles.gcashLabel, !phoneNumber && { color: "#D4501E" }]}>
            GCash Number
          </Text>
          {loadingProfile ? (
            <ActivityIndicator size="small" color="#A09A94" />
          ) : phoneNumber ? (
            <Text style={styles.gcashNumber}>{phoneNumber}</Text>
          ) : (
            <Text style={styles.gcashMissing}>
              No phone number on file. Please update your profile with your verified GCash number.
            </Text>
          )}
        </View>
      </View>

      {/* Amount Input */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Withdraw Amount</Text>
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
            const disabled = preset > balance;
            return (
              <TouchableOpacity
                key={preset}
                style={[
                  styles.presetButton,
                  isSelected && styles.presetButtonSelected,
                  disabled && styles.presetButtonDisabled,
                ]}
                onPress={() => !disabled && handlePresetSelect(preset)}
                activeOpacity={disabled ? 1 : 0.7}
              >
                <Text
                  style={[
                    styles.presetText,
                    isSelected && styles.presetTextSelected,
                    disabled && styles.presetTextDisabled,
                  ]}
                >
                  ₱{preset.toLocaleString()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Info Notice */}
      <View style={styles.noticeCard}>
        <MaterialIcons name="schedule" size={18} color="#D4501E" />
        <Text style={styles.noticeText}>
          Withdrawals are processed within 3 business days. The amount will be sent to your GCash number on file. Ensure your account number is a verified GCash account.
        </Text>
      </View>
    </>
  );

  const renderConfirmStep = () => {
    const numAmount = parseFloat(amount);
    return (
      <>
        <View style={styles.stepHeader}>
          <MaterialIcons name="swap-horiz" size={48} color="#D4501E" />
          <Text style={styles.stepTitle}>Confirm Withdrawal</Text>
          <Text style={styles.stepSubtitle}>
            Please review the details below before submitting.
          </Text>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Amount</Text>
            <Text style={styles.summaryValue}>₱{numAmount.toFixed(2)}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Send to GCash</Text>
            <Text style={styles.summaryValue}>{phoneNumber}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Remaining Balance</Text>
            <Text style={styles.summaryValue}>₱{(balance - numAmount).toFixed(2)}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Processing Time</Text>
            <Text style={[styles.summaryValue, { color: "#D4501E" }]}>Up to 3 business days</Text>
          </View>
        </View>

        <View style={styles.noticeCard}>
          <MaterialIcons name="verified-user" size={18} color="#D4501E" />
          <Text style={styles.noticeText}>
            Make sure your GCash number ({phoneNumber}) is correct and verified. The withdrawal cannot be reversed once processed.
          </Text>
        </View>
      </>
    );
  };

  const renderDoneStep = () => (
    <View style={styles.doneContainer}>
      <View style={styles.doneIconBg}>
        <MaterialIcons name="check-circle" size={56} color="#D4501E" />
      </View>
      <Text style={styles.doneTitle}>Request Submitted!</Text>
      <Text style={styles.doneText}>
        Your withdrawal of ₱{parseFloat(currentRequest?.amount || "0").toFixed(2)} has been received and is now being processed.
      </Text>
      <View style={styles.processingCard}>
        <MaterialIcons name="schedule" size={22} color="#D4501E" />
        <View style={{ flex: 1 }}>
          <Text style={styles.processingTitle}>3–5 Business Days</Text>
          <Text style={styles.processingText}>
            Please wait 3–5 business days for the amount to be sent to your GCash number{phoneNumber ? ` (${phoneNumber})` : ""}.
          </Text>
        </View>
      </View>
      <View style={styles.noticeCard}>
        <MaterialIcons name="notifications-active" size={18} color="#D4501E" />
        <Text style={styles.noticeText}>
          You'll receive a notification once your withdrawal has been completed.
        </Text>
      </View>
    </View>
  );

  const getBottomButton = () => {
    switch (step) {
      case "amount":
        return (
          <TouchableOpacity
            style={[styles.primaryBtn, (!amount || loading || !phoneNumber) && styles.primaryBtnDisabled]}
            onPress={handleContinue}
            disabled={!amount || loading || !phoneNumber}
            activeOpacity={0.8}
          >
            <MaterialIcons name="arrow-forward" size={22} color="#fff" />
            <Text style={styles.primaryBtnText}>
              Continue{amount ? ` — ₱${parseFloat(amount).toLocaleString()}` : ""}
            </Text>
          </TouchableOpacity>
        );
      case "confirm":
        return (
          <View style={{ gap: 10 }}>
            <TouchableOpacity
              style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <MaterialIcons name="send" size={22} color="#fff" />
                  <Text style={styles.primaryBtnText}>Submit Withdrawal</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setStep("amount")} style={styles.backBtn}>
              <Text style={styles.backBtnText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        );
      case "done":
        return (
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryBtnText}>Done</Text>
          </TouchableOpacity>
        );
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["left", "right", "bottom"]}>
      <Stack.Screen options={{ title: "Withdraw" }} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {step === "amount" && renderAmountStep()}
          {step === "confirm" && renderConfirmStep()}
          {step === "done" && renderDoneStep()}
        </ScrollView>

        <View style={styles.bottomBar}>{getBottomButton()}</View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#FFFFFF" },
  scrollContent: { padding: 20, paddingBottom: 16, gap: 20 },

  // Balance card
  balanceCard: {
    backgroundColor: "#D4501E", borderRadius: 20, padding: 24,
    shadowColor: "#D4501E", shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25, shadowRadius: 12, elevation: 6,
  },
  balanceIconRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  walletIconBg: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center", alignItems: "center",
  },
  balanceLabel: { fontSize: 15, color: "rgba(255,255,255,0.7)", fontWeight: "600" },
  balanceAmount: { fontSize: 36, fontWeight: "800", color: "#fff", marginTop: 8, letterSpacing: -0.5 },

  // GCash card
  gcashCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#E6F4F1", borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: "#005f56",
  },
  gcashCardWarning: {
    backgroundColor: "#FFF0EC", borderColor: "#D4501E",
  },
  gcashLabel: { fontSize: 12, fontWeight: "600", color: "#005f56", marginBottom: 2 },
  gcashNumber: { fontSize: 18, fontWeight: "800", color: "#232230" },
  gcashMissing: { fontSize: 13, color: "#D4501E", fontWeight: "500", lineHeight: 18 },

  // Sections
  section: { gap: 10 },
  sectionTitle: {
    fontSize: 13, fontWeight: "700", color: "#A09A94",
    textTransform: "uppercase", letterSpacing: 0.5, marginLeft: 4,
  },
  inputCard: {
    backgroundColor: "#fff", borderRadius: 16, padding: 20,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  currencySymbol: { fontSize: 28, fontWeight: "800", color: "#D4501E" },
  amountInput: { flex: 1, fontSize: 28, fontWeight: "800", color: "#232230", padding: 0 },

  // Presets
  presetGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  presetButton: {
    width: "31%", backgroundColor: "#fff", borderRadius: 12,
    paddingVertical: 14, alignItems: "center",
    borderWidth: 1.5, borderColor: "#E8ECF0",
  },
  presetButtonSelected: { backgroundColor: "#FFF0EC", borderColor: "#D4501E" },
  presetButtonDisabled: { backgroundColor: "#F5F4F2", borderColor: "#E8ECF0" },
  presetText: { fontSize: 15, fontWeight: "700", color: "#232230" },
  presetTextSelected: { color: "#D4501E" },
  presetTextDisabled: { color: "#C7C7CC" },

  // Notice
  processingCard: {
    flexDirection: "row", alignItems: "flex-start", gap: 12,
    backgroundColor: "#FFF0EC", borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: "#D4501E",
  },
  processingTitle: { fontSize: 14, fontWeight: "700", color: "#D4501E", marginBottom: 4 },
  processingText: { fontSize: 13, color: "#D4501E", fontWeight: "500", lineHeight: 18 },
  noticeCard: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#FFF8E1", borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: "#FFE0B2",
  },
  noticeText: { flex: 1, fontSize: 13, color: "#D4501E", fontWeight: "500", lineHeight: 18 },

  // Step header
  stepHeader: { alignItems: "center", gap: 8, paddingTop: 20 },
  stepTitle: { fontSize: 22, fontWeight: "800", color: "#232230" },
  stepSubtitle: { fontSize: 14, color: "#A09A94", textAlign: "center", lineHeight: 20 },

  // Summary
  summaryCard: {
    backgroundColor: "#F5F4F2", borderRadius: 16, padding: 20, gap: 12,
  },
  summaryRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  summaryLabel: { fontSize: 14, color: "#A09A94", fontWeight: "500" },
  summaryValue: { fontSize: 16, fontWeight: "700", color: "#232230" },
  divider: { height: 1, backgroundColor: "#E8ECF0" },

  // Done
  doneContainer: { alignItems: "center", paddingTop: 40, gap: 16 },
  doneIconBg: { marginBottom: 8 },
  doneTitle: { fontSize: 24, fontWeight: "800", color: "#232230" },
  doneText: {
    fontSize: 15, color: "#A09A94", textAlign: "center", lineHeight: 22, paddingHorizontal: 20,
  },

  // Bottom
  bottomBar: {
    padding: 20, paddingTop: 12, backgroundColor: "#FFFFFF",
    borderTopWidth: 1, borderTopColor: "#F0F0F0",
  },
  primaryBtn: {
    backgroundColor: "#D4501E", borderRadius: 14, paddingVertical: 16,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    shadowColor: "#D4501E", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  primaryBtnDisabled: { backgroundColor: "#B0BEC5", shadowOpacity: 0, elevation: 0 },
  primaryBtnText: { color: "#fff", fontSize: 17, fontWeight: "700" },
  backBtn: { alignItems: "center", paddingVertical: 8 },
  backBtnText: { fontSize: 15, color: "#A09A94", fontWeight: "600" },
});
