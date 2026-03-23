import React, { useState } from "react";
import Feather from "@expo/vector-icons/Feather";
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
import { router, useLocalSearchParams } from "expo-router";
import { authService } from "../../src/services/auth";

export default function ResetPasswordScreen() {
  const { email: paramEmail } = useLocalSearchParams();
  const [email, setEmail] = useState(paramEmail ? String(paramEmail) : "");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleResetPassword = async () => {
    if (!email.trim() || !code.trim() || !password || !confirmPassword) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await authService.resetPassword(email, code, password);
      Alert.alert("Success", "Your password has been reset. Please log in.");
      router.replace("/(auth)/login");
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message || "Failed to reset password.");
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
        <View style={styles.logoContainer}>
          <View style={styles.logoIcon}>
            <Feather name="shield" size={32} color="#fff" />
          </View>
          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>Enter the code and your new password</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Email</Text>
          <View style={styles.inputContainer}>
            <Feather name="mail" size={18} color="#A09A94" style={styles.inputIcon} />
            <TextInput
              style={[styles.input, !!paramEmail && { color: "#A09A94" }]}
              placeholder="Enter your email"
              placeholderTextColor="#aaa"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading && !paramEmail}
            />
          </View>

          <Text style={styles.label}>Reset Code</Text>
          <View style={styles.inputContainer}>
            <Feather name="hash" size={18} color="#A09A94" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Enter the code you received"
              placeholderTextColor="#aaa"
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />
          </View>

          <Text style={styles.label}>New Password</Text>
          <View style={styles.inputContainer}>
            <Feather name="lock" size={18} color="#A09A94" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Enter your new password"
              placeholderTextColor="#aaa"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              editable={!loading}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton} disabled={loading}>
              <Feather name={showPassword ? "eye-off" : "eye"} size={18} color="#A09A94" />
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Confirm Password</Text>
          <View style={styles.inputContainer}>
            <Feather name="lock" size={18} color="#A09A94" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Confirm your new password"
              placeholderTextColor="#aaa"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
              editable={!loading}
            />
            <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeButton} disabled={loading}>
              <Feather name={showConfirmPassword ? "eye-off" : "eye"} size={18} color="#A09A94" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleResetPassword}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Reset Password</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()} disabled={loading} activeOpacity={0.8}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  scrollContent: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 24, paddingVertical: 40 },
  logoContainer: { alignItems: "center", marginBottom: 32 },
  logoIcon: {
    width: 72, height: 72, borderRadius: 22, backgroundColor: "#D4501E",
    justifyContent: "center", alignItems: "center",
    shadowColor: "#D4501E", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
  },
  title: { fontSize: 28, fontWeight: "800", color: "#232230", marginTop: 14, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: "#A09A94", marginTop: 4 },
  form: {
    backgroundColor: "#fff", borderRadius: 20, padding: 24,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 16, elevation: 4,
  },
  label: { fontSize: 13, fontWeight: "600", color: "#232230", marginBottom: 8, marginTop: 14, textTransform: "uppercase", letterSpacing: 0.5 },
  inputContainer: {
    flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderColor: "#E8ECF0", borderRadius: 12, backgroundColor: "#FFFFFF",
  },
  inputIcon: { marginLeft: 14 },
  input: { flex: 1, paddingHorizontal: 12, paddingVertical: 14, fontSize: 15, color: "#232230" },
  eyeButton: { padding: 14 },
  button: {
    backgroundColor: "#D4501E", paddingVertical: 16, borderRadius: 14, alignItems: "center", marginTop: 24,
    shadowColor: "#D4501E", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 5,
  },
  buttonDisabled: { backgroundColor: "#A8D5D1", shadowOpacity: 0 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  cancelButton: {
    paddingVertical: 14, borderRadius: 14, alignItems: "center", marginTop: 10, backgroundColor: "#F2F2F7",
  },
  cancelText: { color: "#A09A94", fontSize: 15, fontWeight: "600" },
});
