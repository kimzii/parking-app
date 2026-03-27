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
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { walletService, TopUpRequest } from "../../src/services/wallet";

const PRESET_AMOUNTS = [50, 100, 200, 500, 1000, 2000];

const GCASH_QR = require("../../assets/images/gcash-image.jpg");

type Step = "amount" | "qr" | "proof" | "done";

export default function TopUpScreen() {
  const [step, setStep] = useState<Step>("amount");
  const [amount, setAmount] = useState("");
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [fetchingBalance, setFetchingBalance] = useState(true);
  const [currentRequest, setCurrentRequest] = useState<TopUpRequest | null>(null);
  const [proofUri, setProofUri] = useState<string | null>(null);

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

  const handleCreateRequest = async () => {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount < 1) {
      Alert.alert("Invalid Amount", "Please enter an amount of at least ₱1.");
      return;
    }

    setLoading(true);
    try {
      const request = await walletService.createTopUp(numAmount);
      setCurrentRequest(request);
      setStep("qr");
    } catch {
      Alert.alert("Error", "Failed to create top-up request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePickProof = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setProofUri(result.assets[0].uri);
    }
  };

  const handleSubmitProof = async () => {
    if (!currentRequest || !proofUri) return;

    setLoading(true);
    try {
      await walletService.uploadTopUpProof(currentRequest.id, proofUri);
      setStep("done");
    } catch {
      Alert.alert("Upload Failed", "Could not upload proof. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSkipProof = () => {
    setStep("done");
  };

  const renderAmountStep = () => (
    <>
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

      {/* Info Notice */}
      <View style={styles.noticeCard}>
        <MaterialIcons name="info-outline" size={18} color="#D4501E" />
        <Text style={styles.noticeText}>
          You'll be shown a GCash QR code to pay. After payment, upload a screenshot as proof. Your credits will be added once verified.
        </Text>
      </View>
    </>
  );

  const renderQrStep = () => (
    <>
      <View style={styles.stepHeader}>
        <View style={styles.stepBadge}>
          <Text style={styles.stepBadgeText}>Step 1</Text>
        </View>
        <Text style={styles.stepTitle}>Pay via GCash</Text>
        <Text style={styles.stepSubtitle}>
          Scan the QR code below using your GCash app and pay exactly:
        </Text>
      </View>

      {/* Amount Highlight */}
      <View style={styles.amountHighlight}>
        <Text style={styles.amountHighlightText}>
          ₱{parseFloat(currentRequest?.amount || "0").toFixed(2)}
        </Text>
      </View>

      {/* Reference Code */}
      <View style={styles.refCard}>
        <Text style={styles.refLabel}>Reference Code</Text>
        <Text style={styles.refCode}>{currentRequest?.referenceCode}</Text>
        <Text style={styles.refHint}>Include this as message when paying</Text>
      </View>

      {/* GCash QR */}
      <View style={styles.qrContainer}>
        <Image
          source={GCASH_QR}
          style={styles.qrImage}
          contentFit="contain"
        />
      </View>

      <View style={styles.noticeCard}>
        <MaterialIcons name="warning" size={18} color="#D4501E" />
        <Text style={styles.noticeText}>
          After paying, tap "I've Paid" below to upload your proof of payment.
        </Text>
      </View>
    </>
  );

  const renderProofStep = () => (
    <>
      <View style={styles.stepHeader}>
        <View style={styles.stepBadge}>
          <Text style={styles.stepBadgeText}>Step 2</Text>
        </View>
        <Text style={styles.stepTitle}>Upload Payment Proof</Text>
        <Text style={styles.stepSubtitle}>
          Upload a screenshot of your GCash payment confirmation.
        </Text>
      </View>

      <TouchableOpacity style={styles.uploadArea} onPress={handlePickProof} activeOpacity={0.7}>
        {proofUri ? (
          <Image source={{ uri: proofUri }} style={styles.proofImage} contentFit="contain" />
        ) : (
          <View style={styles.uploadPlaceholder}>
            <MaterialIcons name="cloud-upload" size={40} color="#D4501E" />
            <Text style={styles.uploadText}>Tap to select screenshot</Text>
          </View>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={handleSkipProof} style={styles.skipBtn}>
        <Text style={styles.skipText}>Skip — I'll upload later</Text>
      </TouchableOpacity>
    </>
  );

  const renderDoneStep = () => (
    <View style={styles.doneContainer}>
      <View style={styles.doneIconBg}>
        <MaterialIcons name="check-circle" size={56} color="#D4501E" />
      </View>
      <Text style={styles.doneTitle}>Request Submitted!</Text>
      <Text style={styles.doneText}>
        Your top-up request for ₱{parseFloat(currentRequest?.amount || "0").toFixed(2)} is being reviewed. You'll be notified once approved.
      </Text>
      <View style={styles.refCard}>
        <Text style={styles.refLabel}>Reference Code</Text>
        <Text style={styles.refCode}>{currentRequest?.referenceCode}</Text>
      </View>
    </View>
  );

  const getBottomButton = () => {
    switch (step) {
      case "amount":
        return (
          <TouchableOpacity
            style={[styles.primaryBtn, (!amount || loading) && styles.primaryBtnDisabled]}
            onPress={handleCreateRequest}
            disabled={!amount || loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <MaterialIcons name="qr-code" size={22} color="#fff" />
                <Text style={styles.primaryBtnText}>
                  Continue{amount ? ` — ₱${parseFloat(amount).toLocaleString()}` : ""}
                </Text>
              </>
            )}
          </TouchableOpacity>
        );
      case "qr":
        return (
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => setStep("proof")}
            activeOpacity={0.8}
          >
            <MaterialIcons name="check" size={22} color="#fff" />
            <Text style={styles.primaryBtnText}>I've Paid</Text>
          </TouchableOpacity>
        );
      case "proof":
        return (
          <TouchableOpacity
            style={[styles.primaryBtn, (!proofUri || loading) && styles.primaryBtnDisabled]}
            onPress={handleSubmitProof}
            disabled={!proofUri || loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <MaterialIcons name="send" size={22} color="#fff" />
                <Text style={styles.primaryBtnText}>Submit Proof</Text>
              </>
            )}
          </TouchableOpacity>
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
          {step === "qr" && renderQrStep()}
          {step === "proof" && renderProofStep()}
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
    backgroundColor: "#D4501E",
    borderRadius: 20,
    padding: 24,
    shadowColor: "#D4501E",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  balanceIconRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  walletIconBg: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center", alignItems: "center",
  },
  balanceLabel: { fontSize: 15, color: "rgba(255,255,255,0.7)", fontWeight: "600" },
  balanceAmount: { fontSize: 36, fontWeight: "800", color: "#fff", marginTop: 8, letterSpacing: -0.5 },

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
  presetText: { fontSize: 15, fontWeight: "700", color: "#232230" },
  presetTextSelected: { color: "#D4501E" },

  // Notice
  noticeCard: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#FFF8E1", borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: "#FFE0B2",
  },
  noticeText: { flex: 1, fontSize: 13, color: "#D4501E", fontWeight: "500", lineHeight: 18 },

  // Step header
  stepHeader: { alignItems: "center", gap: 8 },
  stepBadge: {
    backgroundColor: "#FFF0EC", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8,
  },
  stepBadgeText: { fontSize: 12, fontWeight: "700", color: "#D4501E" },
  stepTitle: { fontSize: 22, fontWeight: "800", color: "#232230" },
  stepSubtitle: { fontSize: 14, color: "#A09A94", textAlign: "center", lineHeight: 20 },

  // Amount highlight
  amountHighlight: {
    backgroundColor: "#FFF0EC", borderRadius: 16, padding: 20,
    alignItems: "center", borderWidth: 1.5, borderColor: "#D4501E",
  },
  amountHighlightText: { fontSize: 32, fontWeight: "800", color: "#D4501E" },

  // Reference code
  refCard: {
    backgroundColor: "#F5F4F2", borderRadius: 14, padding: 16, alignItems: "center", gap: 4,
  },
  refLabel: { fontSize: 12, fontWeight: "600", color: "#A09A94" },
  refCode: { fontSize: 20, fontWeight: "800", color: "#232230", letterSpacing: 1 },
  refHint: { fontSize: 11, color: "#A09A94", marginTop: 2 },

  // QR
  qrContainer: {
    alignItems: "center", backgroundColor: "#fff", borderRadius: 16, padding: 20,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 10, elevation: 3,
  },
  qrImage: { width: 250, height: 250 },

  // Upload proof
  uploadArea: {
    borderWidth: 2, borderColor: "#D4501E", borderStyle: "dashed",
    borderRadius: 16, overflow: "hidden", minHeight: 200,
    justifyContent: "center", alignItems: "center",
  },
  uploadPlaceholder: { alignItems: "center", gap: 8, padding: 30 },
  uploadText: { fontSize: 14, fontWeight: "600", color: "#D4501E" },
  proofImage: { width: "100%", height: 300 },
  skipBtn: { alignItems: "center", paddingVertical: 8 },
  skipText: { fontSize: 14, color: "#A09A94", fontWeight: "500" },

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
});
