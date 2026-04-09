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
import { userService } from "../../src/services/user";
import Feather from "@expo/vector-icons/Feather";

export default function ChangePasswordScreen() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "New passwords do not match.");
      return;
    }
    if (
      !/[A-Z]/.test(newPassword) ||
      !/[a-z]/.test(newPassword) ||
      !/[0-9]/.test(newPassword) ||
      !/[^A-Za-z0-9]/.test(newPassword) ||
      newPassword.length < 8
    ) {
      Alert.alert(
        "Error",
        "Password must be at least 8 characters with uppercase, lowercase, number, and special character"
      );
      return;
    }
    setLoading(true);
    try {
      await userService.changePassword(currentPassword, newPassword);
      Alert.alert("Success", "Password changed successfully.");
      router.back();
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message || "Failed to change password.");
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
            <Feather name="lock" size={32} color="#fff" />
          </View>
          <Text style={styles.title}>Change Password</Text>
          <Text style={styles.subtitle}>Update your account password</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Current Password</Text>
          <View style={styles.inputContainer}>
            <Feather name="lock" size={18} color="#A09A94" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Enter current password"
              placeholderTextColor="#aaa"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry={!showCurrent}
              autoCapitalize="none"
              editable={!loading}
            />
            <TouchableOpacity onPress={() => setShowCurrent(!showCurrent)} style={styles.eyeButton} disabled={loading}>
              <Feather name={showCurrent ? "eye-off" : "eye"} size={18} color="#A09A94" />
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>New Password</Text>
          <View style={styles.inputContainer}>
            <Feather name="lock" size={18} color="#A09A94" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Enter new password"
              placeholderTextColor="#aaa"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry={!showNew}
              autoCapitalize="none"
              editable={!loading}
            />
            <TouchableOpacity onPress={() => setShowNew(!showNew)} style={styles.eyeButton} disabled={loading}>
              <Feather name={showNew ? "eye-off" : "eye"} size={18} color="#A09A94" />
            </TouchableOpacity>
          </View>

          {newPassword.length > 0 && (
            <View style={styles.requirements}>
              <Text style={[styles.reqText, /[A-Z]/.test(newPassword) && styles.reqMet]}>
                {/[A-Z]/.test(newPassword) ? "\u2713" : "\u2022"} Uppercase letter
              </Text>
              <Text style={[styles.reqText, /[a-z]/.test(newPassword) && styles.reqMet]}>
                {/[a-z]/.test(newPassword) ? "\u2713" : "\u2022"} Lowercase letter
              </Text>
              <Text style={[styles.reqText, /[0-9]/.test(newPassword) && styles.reqMet]}>
                {/[0-9]/.test(newPassword) ? "\u2713" : "\u2022"} Number
              </Text>
              <Text style={[styles.reqText, /[^A-Za-z0-9]/.test(newPassword) && styles.reqMet]}>
                {/[^A-Za-z0-9]/.test(newPassword) ? "\u2713" : "\u2022"} Special character
              </Text>
              <Text style={[styles.reqText, newPassword.length >= 8 && styles.reqMet]}>
                {newPassword.length >= 8 ? "\u2713" : "\u2022"} At least 8 characters
              </Text>
            </View>
          )}

          <Text style={styles.label}>Confirm New Password</Text>
          <View style={styles.inputContainer}>
            <Feather name="lock" size={18} color="#A09A94" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Confirm new password"
              placeholderTextColor="#aaa"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirm}
              autoCapitalize="none"
              editable={!loading}
            />
            <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} style={styles.eyeButton} disabled={loading}>
              <Feather name={showConfirm ? "eye-off" : "eye"} size={18} color="#A09A94" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleChangePassword}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Change Password</Text>}
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
