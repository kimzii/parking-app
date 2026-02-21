import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { driversService } from "../../src/services/drivers";

export default function DriverVerificationModal() {
  const [licenseNumber, setLicenseNumber] = useState("");
  const [licenseImage, setLicenseImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const pickLicenseImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        "Please allow access to your photo library.",
      );
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
      Alert.alert(
        "Error",
        err?.response?.data?.message || "Failed to apply as driver.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Driver Verification</Text>

      <TextInput
        style={styles.input}
        placeholder="License Number"
        value={licenseNumber}
        onChangeText={setLicenseNumber}
        autoCapitalize="characters"
        editable={!loading}
      />

      <Text style={styles.label}>License Photo</Text>
      <TouchableOpacity
        style={styles.imagePickerButton}
        onPress={pickLicenseImage}
        disabled={loading}
      >
        {licenseImage ? (
          <Image
            source={{ uri: licenseImage }}
            style={styles.licensePreview}
            contentFit="cover"
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="camera-outline" size={32} color="#999" />
            <Text style={styles.imagePlaceholderText}>
              Tap to upload license photo
            </Text>
          </View>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleApply}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Submit</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 30,
  },
  title: {
    fontSize: 20,
    color: "#222",
    fontWeight: "bold",
    marginBottom: 24,
  },
  input: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
    backgroundColor: "#f9f9f9",
  },
  label: {
    alignSelf: "flex-start",
    fontSize: 14,
    fontWeight: "600",
    color: "#11796F",
    marginBottom: 8,
  },
  imagePickerButton: {
    width: "100%",
    marginBottom: 24,
    borderRadius: 8,
    overflow: "hidden",
  },
  licensePreview: {
    width: "100%",
    height: 200,
    borderRadius: 8,
  },
  imagePlaceholder: {
    width: "100%",
    height: 200,
    borderWidth: 1,
    borderColor: "#ccc",
    borderStyle: "dashed",
    borderRadius: 8,
    backgroundColor: "#f9f9f9",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  imagePlaceholderText: {
    color: "#999",
    fontSize: 14,
  },
  button: {
    width: "100%",
    backgroundColor: "#11796F",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
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
