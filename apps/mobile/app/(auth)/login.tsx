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
import * as SecureStore from "expo-secure-store";
import { authService } from "../../src/services/auth";
import { userService } from "../../src/services/user";
import Feather from "@expo/vector-icons/Feather";
import { Image } from "expo-image";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email.trim()) {
      Alert.alert("Error", "Please enter your email");
      return;
    }
    if (!password.trim()) {
      Alert.alert("Error", "Please enter your password");
      return;
    }

    setLoading(true);
    try {
      await authService.login(email.trim(), password);

      // Check user profile to determine correct destination
      const profile = await userService.getProfile();
      const roles: string[] = profile.roles || [];

      if (roles.length === 0) {
        router.replace("/(auth)/select-role");
      } else if (!profile.firstName) {
        const selectedRole = roles.includes("HOST") ? "HOST" : "DRIVER";
        router.replace(`/(auth)/complete-profile?role=${selectedRole}` as any);
      } else if (roles.includes("HOST") && !roles.includes("DRIVER")) {
        // HOST-only user — always go to host tabs
        await SecureStore.setItemAsync("viewMode", "host");
        router.replace("/(host-tabs)" as any);
      } else {
        // Has DRIVER role — check saved viewMode preference
        const viewMode = await SecureStore.getItemAsync("viewMode");
        if (viewMode === "host" && roles.includes("HOST")) {
          router.replace("/(host-tabs)" as any);
        } else {
          await SecureStore.setItemAsync("viewMode", "driver");
          router.replace("/(tabs)");
        }
      }
    } catch (error: any) {
      console.error("Login error:", error);
      if (error.response) {
        console.error("Error response:", error.response);
      }
      const message =
        error.response?.data?.message ||
        error.message ||
        "Login failed. Please try again.";
      Alert.alert("Login Failed", message);
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
          <Image
            source={require("../../assets/images/icon.png")}
            style={styles.logoImage}
            contentFit="contain"
          />
          <Text style={styles.subtitle}>Find & Book Parking Easily</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.formTitle}>Welcome back</Text>
          <Text style={styles.formSubtitle}>Sign in to your account</Text>

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

          <TouchableOpacity
            style={styles.forgotButton}
            onPress={() => router.replace("/(modals)/forgot-password")}
          >
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Log In</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.signupContainer}>
          <Text style={styles.signupText}>Don&apos;t have an account? </Text>
          <TouchableOpacity onPress={() => router.replace("/(auth)/signup")}>
            <Text style={styles.signupLink}>Sign Up</Text>
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
  logoImage: {
    width: 160,
    height: 160,
    marginBottom: 8,
  },
  title: {
    fontSize: 30,
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
  formTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#232230",
  },
  formSubtitle: {
    fontSize: 14,
    color: "#A09A94",
    marginTop: 4,
    marginBottom: 20,
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
  forgotButton: {
    alignSelf: "flex-end",
    marginTop: 12,
    marginBottom: 4,
  },
  forgotText: {
    color: "#D4501E",
    fontSize: 13,
    fontWeight: "600",
  },
  button: {
    backgroundColor: "#D4501E",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 16,
    shadowColor: "#D4501E",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonDisabled: {
    backgroundColor: "#B0BEC5",
    shadowOpacity: 0,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  signupContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
  },
  signupText: {
    color: "#A09A94",
    fontSize: 14,
  },
  signupLink: {
    color: "#D4501E",
    fontSize: 14,
    fontWeight: "700",
  },
});
