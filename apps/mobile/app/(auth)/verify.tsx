import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { authService } from "../../src/services/auth";
import Feather from "@expo/vector-icons/Feather";

export default function VerifyScreen() {
  const { email } = useLocalSearchParams();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [missingEmail, setMissingEmail] = useState(false);
  const alertShownRef = useRef(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [expirySeconds, setExpirySeconds] = useState(300);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (!email && !alertShownRef.current) {
      setMissingEmail(true);
      alertShownRef.current = true;
      Alert.alert(
        "Error",
        "No email provided. Please sign up or log in again.",
        [{ text: "OK", onPress: () => router.replace("/(auth)/signup") }],
      );
    }
    const interval = setInterval(() => {
      setExpirySeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [email]);

  const handleVerify = async () => {
    if (!code.trim()) {
      Alert.alert("Error", "Please enter the verification code");
      return;
    }
    setLoading(true);
    try {
      const result = await authService.verifyEmail(email as string, code.trim());
      // Auto-login: save tokens returned from verification
      if (result.accessToken && result.refreshToken) {
        const SecureStore = await import("expo-secure-store");
        await SecureStore.setItemAsync("accessToken", result.accessToken);
        await SecureStore.setItemAsync("refreshToken", result.refreshToken);
      }
      Alert.alert("Success", "Email verified!");
      router.replace("/(auth)/select-role");
    } catch (error: any) {
      const message =
        error.response?.data?.message ||
        error.message ||
        "Verification failed. Please try again.";
      Alert.alert("Verification Failed", message);
      console.error("Verification error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await authService.resendVerification(email as string);
      setExpirySeconds(300);
      Alert.alert("Verification code sent", "A new code has been sent to your email.");
    } catch (error: any) {
      const message =
        error.response?.data?.message ||
        error.message ||
        "Failed to resend verification code.";
      Alert.alert("Resend Failed", message);
      console.error("Resend error:", error);
    } finally {
      setResending(false);
    }
  };

  if (missingEmail) return null;

  const minutes = Math.floor(expirySeconds / 60);
  const seconds = expirySeconds % 60;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={inputFocused ? (Platform.OS === "ios" ? "padding" : "height") : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logoContainer}>
          <View style={styles.logoIcon}>
            <Feather name="mail" size={32} color="#fff" />
          </View>
          <Text style={styles.title}>Verify Email</Text>
          <Text style={styles.subtitle}>Enter the code sent to your email</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.timerContainer}>
            <Feather name="clock" size={16} color={expirySeconds > 60 ? "#11796F" : "#E53935"} />
            <Text style={[styles.timerText, expirySeconds <= 60 && styles.timerExpiring]}>
              Code expires in {minutes}:{seconds.toString().padStart(2, "0")}
            </Text>
          </View>

          <Text style={styles.label}>Verification Code</Text>
          <View style={styles.inputContainer}>
            <Feather name="hash" size={18} color="#8E8E93" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Enter code"
              placeholderTextColor="#aaa"
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              autoCapitalize="none"
              autoCorrect={false}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
            />
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleVerify}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Verify</Text>
            )}
          </TouchableOpacity>

          {expirySeconds === 0 && (
            <TouchableOpacity
              style={[styles.resendButton, resending && { opacity: 0.6 }]}
              onPress={handleResend}
              disabled={resending}
              activeOpacity={0.8}
            >
              {resending ? (
                <ActivityIndicator color="#11796F" />
              ) : (
                <Text style={styles.resendText}>Resend Verification Code</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFB" },
  scrollContent: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 24, paddingVertical: 40 },
  logoContainer: { alignItems: "center", marginBottom: 32 },
  logoIcon: {
    width: 72, height: 72, borderRadius: 22, backgroundColor: "#11796F",
    justifyContent: "center", alignItems: "center",
    shadowColor: "#11796F", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
  },
  title: { fontSize: 28, fontWeight: "800", color: "#1A1A2E", marginTop: 14, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: "#8E8E93", marginTop: 4, textAlign: "center" },
  form: {
    backgroundColor: "#fff", borderRadius: 20, padding: 24,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 16, elevation: 4,
  },
  timerContainer: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    backgroundColor: "#F2F2F7", paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, marginBottom: 20,
  },
  timerText: { fontSize: 14, fontWeight: "600", color: "#1A1A2E" },
  timerExpiring: { color: "#E53935" },
  label: { fontSize: 13, fontWeight: "600", color: "#1A1A2E", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  inputContainer: {
    flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderColor: "#E8ECF0", borderRadius: 12, backgroundColor: "#F8FAFB",
  },
  inputIcon: { marginLeft: 14 },
  input: { flex: 1, paddingHorizontal: 12, paddingVertical: 14, fontSize: 15, color: "#1A1A2E" },
  button: {
    backgroundColor: "#11796F", paddingVertical: 16, borderRadius: 14, alignItems: "center", marginTop: 20,
    shadowColor: "#11796F", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 5,
  },
  buttonDisabled: { backgroundColor: "#A8D5D1", shadowOpacity: 0 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  resendButton: { paddingVertical: 14, borderRadius: 14, alignItems: "center", marginTop: 12, backgroundColor: "#E8F5F3" },
  resendText: { color: "#11796F", fontSize: 15, fontWeight: "700" },
});
