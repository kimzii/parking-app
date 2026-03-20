import React, { useState } from "react";
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
import { router } from "expo-router";
import { authService } from "../../src/services/auth";
import Feather from "@expo/vector-icons/Feather";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert("Error", "Please enter your email address.");
      return;
    }
    setLoading(true);
    try {
      await authService.forgotPassword(email);
      Alert.alert(
        "Success",
        "If your email is registered, you will receive a password reset link.",
        [
          {
            text: "OK",
            onPress: () =>
              router.replace({
                pathname: "/(modals)/reset-password",
                params: { email },
              }),
          },
        ],
      );
    } catch (err: any) {
      Alert.alert(
        "Error",
        err?.response?.data?.message || "Failed to send reset email.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Feather name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>

        <View style={styles.logoContainer}>
          <View style={styles.logoIcon}>
            <Feather name="help-circle" size={32} color="#fff" />
          </View>
          <Text style={styles.title}>Forgot Password</Text>
          <Text style={styles.subtitle}>We&apos;ll send you a reset code</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Email</Text>
          <View style={styles.inputContainer}>
            <Feather
              name="mail"
              size={18}
              color="#8E8E93"
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              placeholderTextColor="#aaa"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleForgotPassword}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Send Reset Link</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFB" },
  backButton: { position: "absolute" as const, top: 50, left: 20, zIndex: 10, padding: 8 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  logoContainer: { alignItems: "center", marginBottom: 32 },
  logoIcon: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: "#11796F",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#11796F",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1A1A2E",
    marginTop: 14,
    letterSpacing: -0.5,
  },
  subtitle: { fontSize: 14, color: "#8E8E93", marginTop: 4 },
  form: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1A1A2E",
    marginBottom: 8,
    marginTop: 14,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#E8ECF0",
    borderRadius: 12,
    backgroundColor: "#F8FAFB",
  },
  inputIcon: { marginLeft: 14 },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 14,
    fontSize: 15,
    color: "#1A1A2E",
  },
  button: {
    backgroundColor: "#11796F",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 24,
    shadowColor: "#11796F",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonDisabled: { backgroundColor: "#A8D5D1", shadowOpacity: 0 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
