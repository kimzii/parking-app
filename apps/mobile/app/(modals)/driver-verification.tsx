import React, { useState } from "react";
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
import { Ionicons } from "@expo/vector-icons";
import Feather from "@expo/vector-icons/Feather";
import { driversService } from "../../src/services/drivers";

export default function DriverVerificationModal() {
  const [licenseNumber, setLicenseNumber] = useState("");
  const [licenseImage, setLicenseImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message || "Failed to apply as driver.");
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
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Submit Application</Text>}
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
