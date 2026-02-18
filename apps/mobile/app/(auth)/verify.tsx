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
  const [expirySeconds, setExpirySeconds] = useState(60); // 1 min default
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (!email && !alertShownRef.current) {
      setMissingEmail(true);
      alertShownRef.current = true;
      Alert.alert(
        "Error",
        "No email provided. Please sign up or log in again.",
        [
          {
            text: "OK",
            onPress: () => router.replace("/(auth)/signup"),
          },
        ],
      );
    }
    // Start countdown timer
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
      await authService.verifyEmail(email as string, code.trim());
      Alert.alert("Success", "Email verified! You can now log in.");
      router.replace("/(auth)/login");
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
      setExpirySeconds(60); // Reset timer to 1 min
      Alert.alert(
        "Verification code sent",
        "A new code has been sent to your email.",
      );
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

  if (missingEmail) {
    return null;
  }

  // Format timer as mm:ss
  const minutes = Math.floor(expirySeconds / 60);
  const seconds = expirySeconds % 60;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={
        inputFocused
          ? Platform.OS === "ios"
            ? "padding"
            : "height"
          : undefined
      }
    >
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Feather name="mail" size={60} color="#11796F" />
          <Text style={styles.title}>Verify Email</Text>
          <Text style={styles.subtitle}>Enter the code sent to your email</Text>
          <Text style={{ color: "#333", fontSize: 16, marginTop: 8 }}>
            Code expires in {minutes}:{seconds.toString().padStart(2, "0")}
          </Text>
        </View>
        <View style={styles.form}>
          <Text style={styles.label}>Verification Code</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter code"
            placeholderTextColor="#999"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            autoCapitalize="none"
            autoCorrect={false}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
          />
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleVerify}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Verify</Text>
            )}
          </TouchableOpacity>
          {expirySeconds === 0 && (
            <TouchableOpacity
              style={[
                styles.button,
                resending && styles.buttonDisabled,
                { backgroundColor: "#90CAF9", marginTop: 10 },
              ]}
              onPress={handleResend}
              disabled={resending}
            >
              {resending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Resend Verification Code</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 30,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#11796F",
    marginTop: 10,
  },
  subtitle: {
    fontSize: 14,
    color: "#888",
    marginTop: 5,
    textAlign: "center",
  },
  form: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#fafafa",
    color: "#333",
  },
  button: {
    backgroundColor: "#11796F",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
  },
  buttonDisabled: {
    backgroundColor: "#90CAF9",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
