import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import Feather from "@expo/vector-icons/Feather";
import { driversService } from "../../src/services/drivers";
import { userService } from "../../src/services/user";

type VerificationState = "loading" | "pending" | "verified" | "rejected" | "unsubmitted";

export default function DriverVerificationModal() {
  const [licenseNumber, setLicenseNumber] = useState("");
  const [licenseImage, setLicenseImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [verificationState, setVerificationState] = useState<VerificationState>("loading");

  useEffect(() => {
    checkVerificationStatus();
  }, []);

  const checkVerificationStatus = async () => {
    try {
      const profile = await userService.getProfile();
      const driverRole = profile.roleStatuses?.find(
        (r: { role: string; status: string }) => r.role === "DRIVER",
      );

      if (!driverRole) {
        setVerificationState("unsubmitted");
      } else if (driverRole.status === "VERIFIED") {
        setVerificationState("verified");
      } else if (driverRole.status === "REJECTED") {
        setVerificationState("rejected");
      } else if (driverRole.status === "PENDING") {
        setVerificationState("pending");
      } else {
        setVerificationState("unsubmitted");
      }
    } catch {
      setVerificationState("unsubmitted");
    }
  };

  const pickLicenseImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please allow access to your photo library.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setLicenseImage(result.assets[0].uri);
    }
  };

  const handleApply = async () => {
    if (!licenseNumber.trim()) {
      Alert.alert("Error", "Please enter your license number.");
      return;
    }
    if (!licenseImage) {
      Alert.alert("Error", "Please upload a photo of your license.");
      return;
    }
    setLoading(true);
    try {
      const uploadResult = await driversService.uploadLicenseImage(licenseImage);
      await driversService.applyAsDriver({
        licenseNumber,
        licenseImageUrl: uploadResult.url,
      });
      Alert.alert("Success", "Driver application submitted!");
      setLicenseNumber("");
      setLicenseImage(null);
      setVerificationState("pending");
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message || "Failed to apply as driver.");
    } finally {
      setLoading(false);
    }
  };

  if (verificationState === "loading") {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#D4501E" />
      </View>
    );
  }

  if (verificationState === "pending") {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.statusCard}>
          <View style={[styles.statusIcon, { backgroundColor: "#FFF0EC" }]}>
            <MaterialIcons name="hourglass-top" size={40} color="#D4501E" />
          </View>
          <Text style={styles.statusTitle}>Verification In Progress</Text>
          <Text style={styles.statusText}>
            Your driver application has been submitted and is currently under review. We'll notify you once it's been processed.
          </Text>
          <View style={styles.statusBadge}>
            <MaterialIcons name="schedule" size={16} color="#D4501E" />
            <Text style={styles.statusBadgeText}>Pending Review</Text>
          </View>
        </View>
      </View>
    );
  }

  if (verificationState === "verified") {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.statusCard}>
          <View style={[styles.statusIcon, { backgroundColor: "#F0FBF1" }]}>
            <MaterialIcons name="verified" size={40} color="#4CAF50" />
          </View>
          <Text style={styles.statusTitle}>You're Verified!</Text>
          <Text style={styles.statusText}>
            Your driver account has been verified. You can now book parking spaces.
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: "#F0FBF1" }]}>
            <MaterialIcons name="check-circle" size={16} color="#4CAF50" />
            <Text style={[styles.statusBadgeText, { color: "#4CAF50" }]}>Verified Driver</Text>
          </View>
        </View>
      </View>
    );
  }

  // "rejected" or "unsubmitted" — show the form
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
        {verificationState === "rejected" && (
          <View style={styles.rejectedBanner}>
            <MaterialIcons name="error-outline" size={20} color="#E53935" />
            <Text style={styles.rejectedText}>
              Your previous application was rejected. Please resubmit with correct information.
            </Text>
          </View>
        )}

        <View style={styles.logoContainer}>
          <View style={styles.logoIcon}>
            <Feather name="shield" size={32} color="#fff" />
          </View>
          <Text style={styles.title}>Driver Verification</Text>
          <Text style={styles.subtitle}>Upload your license to get verified</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>License Number</Text>
          <View style={styles.inputContainer}>
            <Feather name="credit-card" size={18} color="#A09A94" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Enter license number"
              placeholderTextColor="#aaa"
              value={licenseNumber}
              onChangeText={setLicenseNumber}
              autoCapitalize="characters"
              editable={!loading}
            />
          </View>

          <Text style={styles.label}>License Photo</Text>
          <TouchableOpacity
            style={styles.imagePickerButton}
            onPress={pickLicenseImage}
            disabled={loading}
            activeOpacity={0.8}
          >
            {licenseImage ? (
              <Image source={{ uri: licenseImage }} style={styles.licensePreview} contentFit="cover" />
            ) : (
              <View style={styles.imagePlaceholder}>
                <View style={styles.cameraCircle}>
                  <Ionicons name="camera-outline" size={28} color="#D4501E" />
                </View>
                <Text style={styles.imagePlaceholderTitle}>Tap to upload</Text>
                <Text style={styles.imagePlaceholderText}>Take or choose a photo of your license</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleApply}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? <ActivityIndicator color="#fff" /> : (
              <Text style={styles.buttonText}>
                {verificationState === "rejected" ? "Resubmit Application" : "Submit Application"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  scrollContent: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 24, paddingVertical: 40 },
  centerContainer: { flex: 1, backgroundColor: "#FFFFFF", justifyContent: "center", alignItems: "center", paddingHorizontal: 24 },

  // Status card
  statusCard: {
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 32,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },
  statusIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  statusTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#232230",
    marginBottom: 10,
    textAlign: "center",
  },
  statusText: {
    fontSize: 14,
    color: "#A09A94",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFF0EC",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  statusBadgeText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#D4501E",
  },

  // Rejected banner
  rejectedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFEBEE",
    padding: 14,
    borderRadius: 12,
    marginBottom: 20,
  },
  rejectedText: {
    flex: 1,
    fontSize: 13,
    color: "#E53935",
    lineHeight: 18,
  },

  // Form
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
  imagePickerButton: { borderRadius: 16, overflow: "hidden", marginBottom: 8 },
  licensePreview: { width: "100%", height: 200, borderRadius: 16 },
  imagePlaceholder: {
    width: "100%", height: 200,
    borderWidth: 2, borderColor: "#E8ECF0", borderStyle: "dashed", borderRadius: 16,
    backgroundColor: "#FFFFFF", justifyContent: "center", alignItems: "center", gap: 6,
  },
  cameraCircle: {
    width: 56, height: 56, borderRadius: 18, backgroundColor: "#FFF0EC",
    justifyContent: "center", alignItems: "center", marginBottom: 4,
  },
  imagePlaceholderTitle: { fontSize: 15, fontWeight: "700", color: "#232230" },
  imagePlaceholderText: { fontSize: 13, color: "#A09A94" },
  button: {
    backgroundColor: "#D4501E", paddingVertical: 16, borderRadius: 14, alignItems: "center", marginTop: 16,
    shadowColor: "#D4501E", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 5,
  },
  buttonDisabled: { backgroundColor: "#A8D5D1", shadowOpacity: 0 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
