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
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { router } from "expo-router";
import { authService } from "../../src/services/auth";
import Feather from "@expo/vector-icons/Feather";
import LegalModal, { LegalTab } from "../../src/components/LegalModal";
import { SafeAreaView } from "react-native-safe-area-context";

const formatDateForApi = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDateForDisplay = (date: Date) => {
  return date.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export default function SignupScreen() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [sex, setSex] = useState("");
  const [birthdayDate, setBirthdayDate] = useState<Date | null>(null);
  const [showBirthdayPicker, setShowBirthdayPicker] = useState(false);
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<LegalTab>("terms");

  const canSubmit = termsAccepted && privacyAccepted && !loading;

  const openModal = (tab: LegalTab) => {
    setActiveTab(tab);
    setModalVisible(true);
  };

  const handleBirthdayChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date,
  ) => {
    if (Platform.OS === "android") {
      setShowBirthdayPicker(false);
    }

    if (event.type === "dismissed") {
      return;
    }

    if (selectedDate) {
      setBirthdayDate(selectedDate);
    }
  };

  const handleSignup = async () => {
    const birthdayValue = birthdayDate ? formatDateForApi(birthdayDate) : "";

    if (!firstName.trim()) {
      Alert.alert("Error", "Please enter your first name");
      return;
    }
    if (!lastName.trim()) {
      Alert.alert("Error", "Please enter your last name");
      return;
    }
    if (!sex) {
      Alert.alert("Error", "Please select your sex");
      return;
    }
    if (!birthdayValue) {
      Alert.alert("Error", "Please enter your birthday");
      return;
    }
    if (!email.trim()) {
      Alert.alert("Error", "Please enter your email");
      return;
    }
    if (!phoneNumber.trim()) {
      Alert.alert("Error", "Please enter your mobile/GCash number");
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
    if (
      !/[A-Z]/.test(password) ||
      !/[a-z]/.test(password) ||
      !/[0-9]/.test(password) ||
      !/[^A-Za-z0-9]/.test(password) ||
      password.length < 8
    ) {
      Alert.alert(
        "Error",
        "Password must be at least 8 characters with uppercase, lowercase, number, and special character",
      );
      return;
    }

    setLoading(true);
    try {
      await authService.register({
        email: email.trim(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phoneNumber: phoneNumber.trim(),
        sex,
        birthday: birthdayValue,
        termsAccepted,
        privacyAccepted,
      });
      Alert.alert(
        "Verify your email First",
        "We sent a verification code to your email.",
      );
      router.replace({
        pathname: "/(auth)/verify",
        params: { email: email.trim() },
      });
    } catch (error: any) {
      const raw = error.response?.data?.message;
      const message = Array.isArray(raw)
        ? raw.join("\n")
        : raw || error.message || "Signup failed. Please try again.";
      Alert.alert("Signup Failed", message);
      console.error("Signup error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
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
            {/* Name Row */}
            <View style={styles.nameRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>First Name</Text>
                <View style={styles.inputContainer}>
                  <Feather
                    name="user"
                    size={18}
                    color="#A09A94"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="First Name"
                    placeholderTextColor="#aaa"
                    value={firstName}
                    onChangeText={setFirstName}
                    autoCapitalize="words"
                    autoCorrect={false}
                  />
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Last Name</Text>
                <View style={styles.inputContainer}>
                  <Feather
                    name="user"
                    size={18}
                    color="#A09A94"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Last Name"
                    placeholderTextColor="#aaa"
                    value={lastName}
                    onChangeText={setLastName}
                    autoCapitalize="words"
                    autoCorrect={false}
                  />
                </View>
              </View>
            </View>

            <Text style={styles.label}>Sex</Text>
            <View style={styles.sexRow}>
              {["MALE", "FEMALE"].map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.sexButton,
                    sex === option && styles.sexButtonSelected,
                  ]}
                  onPress={() => setSex(option)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.sexButtonText,
                      sex === option && styles.sexButtonTextSelected,
                    ]}
                  >
                    {option.charAt(0) + option.slice(1).toLowerCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Birthday</Text>
            <TouchableOpacity
              style={styles.inputContainer}
              onPress={() => setShowBirthdayPicker(true)}
              activeOpacity={0.7}
            >
              <Feather
                name="calendar"
                size={18}
                color="#A09A94"
                style={styles.inputIcon}
              />
              <Text
                style={[
                  styles.input,
                  !birthdayDate && styles.datePlaceholderText,
                  styles.dateValueText,
                ]}
              >
                {birthdayDate
                  ? formatDateForDisplay(birthdayDate)
                  : "Tap to select birthday"}
              </Text>
            </TouchableOpacity>

            {showBirthdayPicker && (
              <View style={styles.datePickerBox}>
                <DateTimePicker
                  value={birthdayDate ?? new Date(2000, 0, 1)}
                  mode="date"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  maximumDate={new Date()}
                  minimumDate={new Date(1900, 0, 1)}
                  onChange={handleBirthdayChange}
                />
                {Platform.OS === "ios" && (
                  <TouchableOpacity
                    onPress={() => setShowBirthdayPicker(false)}
                    style={styles.datePickerDoneButton}
                  >
                    <Text style={styles.datePickerDoneText}>Done</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            <Text style={styles.label}>Email</Text>
            <View style={styles.inputContainer}>
              <Feather
                name="mail"
                size={18}
                color="#A09A94"
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
              />
            </View>

            <Text style={styles.label}>Mobile / GCash Number</Text>
            <View style={styles.inputContainer}>
              <Feather
                name="phone"
                size={18}
                color="#A09A94"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="e.g. 09171234567"
                placeholderTextColor="#aaa"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                keyboardType="phone-pad"
                autoCapitalize="none"
              />
            </View>

            <Text style={styles.label}>Password</Text>
            <View style={styles.inputContainer}>
              <Feather
                name="lock"
                size={18}
                color="#A09A94"
                style={styles.inputIcon}
              />
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
                <Text
                  style={[
                    styles.reqText,
                    /[A-Z]/.test(password) && styles.reqMet,
                  ]}
                >
                  {/[A-Z]/.test(password) ? "\u2713" : "\u2022"} Uppercase
                  letter
                </Text>
                <Text
                  style={[
                    styles.reqText,
                    /[a-z]/.test(password) && styles.reqMet,
                  ]}
                >
                  {/[a-z]/.test(password) ? "\u2713" : "\u2022"} Lowercase
                  letter
                </Text>
                <Text
                  style={[
                    styles.reqText,
                    /[0-9]/.test(password) && styles.reqMet,
                  ]}
                >
                  {/[0-9]/.test(password) ? "\u2713" : "\u2022"} Number
                </Text>
                <Text
                  style={[
                    styles.reqText,
                    /[^A-Za-z0-9]/.test(password) && styles.reqMet,
                  ]}
                >
                  {/[^A-Za-z0-9]/.test(password) ? "\u2713" : "\u2022"} Special
                  character
                </Text>
                <Text
                  style={[
                    styles.reqText,
                    password.length >= 8 && styles.reqMet,
                  ]}
                >
                  {password.length >= 8 ? "\u2713" : "\u2022"} At least 8
                  characters
                </Text>
              </View>
            )}

            <Text style={styles.label}>Confirm Password</Text>
            <View style={styles.inputContainer}>
              <Feather
                name="lock"
                size={18}
                color="#A09A94"
                style={styles.inputIcon}
              />
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

            {/* Terms & Privacy Checkboxes */}
            <View style={styles.consentSection}>
              <TouchableOpacity
                style={styles.consentRow}
                onPress={() => setTermsAccepted(!termsAccepted)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.checkbox,
                    termsAccepted && styles.checkboxChecked,
                  ]}
                >
                  {termsAccepted && (
                    <Feather name="check" size={12} color="#fff" />
                  )}
                </View>
                <Text style={styles.consentText}>
                  I have read and agree to the{" "}
                  <Text
                    style={styles.consentLink}
                    onPress={() => openModal("terms")}
                  >
                    Terms and Conditions
                  </Text>
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.consentRow}
                onPress={() => setPrivacyAccepted(!privacyAccepted)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.checkbox,
                    privacyAccepted && styles.checkboxChecked,
                  ]}
                >
                  {privacyAccepted && (
                    <Feather name="check" size={12} color="#fff" />
                  )}
                </View>
                <Text style={styles.consentText}>
                  I have read and agree to the{" "}
                  <Text
                    style={styles.consentLink}
                    onPress={() => openModal("privacy")}
                  >
                    Data Privacy Policy
                  </Text>
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.button, !canSubmit && styles.buttonDisabled]}
              onPress={handleSignup}
              disabled={!canSubmit}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Create Account</Text>
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

        <LegalModal
          visible={modalVisible}
          initialTab={activeTab}
          onClose={() => setModalVisible(false)}
          onAccept={(tab) => {
            if (tab === "terms") setTermsAccepted(true);
            else setPrivacyAccepted(true);
            setModalVisible(false);
          }}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
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
  nameRow: {
    flexDirection: "row",
    gap: 12,
  },
  sexRow: {
    flexDirection: "row",
    gap: 10,
  },
  sexButton: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#E8ECF0",
    backgroundColor: "#FFFFFF",
  },
  sexButtonSelected: {
    backgroundColor: "#FFF0EC",
    borderColor: "#D4501E",
  },
  sexButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#232230",
  },
  sexButtonTextSelected: {
    color: "#D4501E",
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
  dateValueText: {
    paddingTop: 14,
  },
  datePlaceholderText: {
    color: "#aaa",
  },
  datePickerBox: {
    marginTop: 8,
    borderWidth: 1.5,
    borderColor: "#E8ECF0",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },
  datePickerDoneButton: {
    alignSelf: "flex-end",
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  datePickerDoneText: {
    color: "#D4501E",
    fontSize: 14,
    fontWeight: "700",
  },
  eyeButton: {
    padding: 14,
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
  consentSection: {
    marginTop: 20,
    gap: 12,
  },
  consentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: "#D4501E",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
    flexShrink: 0,
  },
  checkboxChecked: {
    backgroundColor: "#D4501E",
    borderColor: "#D4501E",
  },
  consentText: {
    flex: 1,
    fontSize: 13,
    color: "#232230",
    lineHeight: 20,
  },
  consentLink: {
    color: "#D4501E",
    fontWeight: "700",
    textDecorationLine: "underline",
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
    backgroundColor: "#C5C5C5",
    shadowOpacity: 0,
    elevation: 0,
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
});
