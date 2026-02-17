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

  if (missingEmail) {
    return null;
  }

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
          <Feather name="mail" size={60} color="#00665A" />
          <Text style={styles.title}>Verify Email</Text>
          <Text style={styles.subtitle}>Enter the code sent to your email</Text>
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
    color: "#00665A",
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
    backgroundColor: "#00665A",
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
