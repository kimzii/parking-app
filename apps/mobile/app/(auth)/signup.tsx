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

export default function SignupScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSignup = async () => {
    if (!email.trim()) {
      Alert.alert("Error", "Please enter your email");
      return;
    }
    if (!password.trim()) {
      Alert.alert("Error", "Please enter your password");
      return;
    }
    if (!confirmPassword.trim()) {
      Alert.alert("Error", "Please confirm your password");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password) || password.length < 8) {
      Alert.alert("Error", "Password must be at least 8 characters with uppercase, lowercase, number, and special character");
      return;
    }

    setLoading(true);
    try {
      await authService.register(email.trim(), password);
      Alert.alert("Verify your email First", "We sent a verification code to your email.");
      router.replace({
        pathname: "/(auth)/verify",
        params: { email: email.trim() },
      });
    } catch (error: any) {
      const message =
        error.response?.data?.message ||
        error.message ||
        "Signup failed. Please try again.";
      Alert.alert("Signup Failed", message);
      console.error("Signup error:", error);
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
            <Feather name="user-plus" size={32} color="#fff" />
          </View>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Sign up to get started</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Email</Text>
          <View style={styles.inputContainer}>
            <Feather name="mail" size={18} color="#A09A94" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              placeholderTextColor="#aaa"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <Text style={styles.label}>Password</Text>
          <View style={styles.inputContainer}>
            <Feather name="lock" size={18} color="#A09A94" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Enter your password"
              placeholderTextColor="#aaa"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeButton}
            >
              <Feather
                name={showPassword ? "eye-off" : "eye"}
                size={18}
                color="#A09A94"
              />
            </TouchableOpacity>
          </View>

          {password.length > 0 && (
            <View style={styles.requirements}>
              <Text style={[styles.reqText, /[A-Z]/.test(password) && styles.reqMet]}>
                {/[A-Z]/.test(password) ? "\u2713" : "\u2022"} Uppercase letter
              </Text>
              <Text style={[styles.reqText, /[a-z]/.test(password) && styles.reqMet]}>
                {/[a-z]/.test(password) ? "\u2713" : "\u2022"} Lowercase letter
              </Text>
              <Text style={[styles.reqText, /[0-9]/.test(password) && styles.reqMet]}>
                {/[0-9]/.test(password) ? "\u2713" : "\u2022"} Number
              </Text>
              <Text style={[styles.reqText, /[^A-Za-z0-9]/.test(password) && styles.reqMet]}>
                {/[^A-Za-z0-9]/.test(password) ? "\u2713" : "\u2022"} Special character
              </Text>
              <Text style={[styles.reqText, password.length >= 8 && styles.reqMet]}>
                {password.length >= 8 ? "\u2713" : "\u2022"} At least 8 characters
              </Text>
            </View>
          )}

          <Text style={styles.label}>Confirm Password</Text>
          <View style={styles.inputContainer}>
            <Feather name="lock" size={18} color="#A09A94" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Confirm your password"
              placeholderTextColor="#aaa"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              style={styles.eyeButton}
            >
              <Feather
                name={showConfirmPassword ? "eye-off" : "eye"}
                size={18}
                color="#A09A94"
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSignup}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Sign Up</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.loginContainer}>
          <Text style={styles.loginText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.replace("/(auth)/login")}>
            <Text style={styles.loginLink}>Log In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  logoIcon: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: "#D4501E",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#D4501E",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#232230",
    marginTop: 14,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: "#A09A94",
    marginTop: 4,
  },
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
    color: "#232230",
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
    backgroundColor: "#FFFFFF",
  },
  inputIcon: {
    marginLeft: 14,
  },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 14,
    fontSize: 15,
    color: "#232230",
  },
  eyeButton: {
    padding: 14,
  },
  button: {
    backgroundColor: "#D4501E",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 24,
    shadowColor: "#D4501E",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonDisabled: {
    backgroundColor: "#A8D5D1",
    shadowOpacity: 0,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  loginContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
  },
  loginText: {
    color: "#A09A94",
    fontSize: 14,
  },
  loginLink: {
    color: "#D4501E",
    fontSize: 14,
    fontWeight: "700",
  },
  requirements: {
    marginTop: 8,
    gap: 2,
  },
  reqText: {
    fontSize: 12,
    color: "#E53935",
  },
  reqMet: {
    color: "#4CAF50",
  },
});
