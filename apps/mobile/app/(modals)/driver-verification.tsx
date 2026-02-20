
import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { driversService } from "../../src/services/drivers";


export default function DriverVerificationModal() {
  const [licenseNumber, setLicenseNumber] = useState("");
  const [loading, setLoading] = useState(false);

  const handleApply = async () => {
    if (!licenseNumber.trim()) {
      Alert.alert("Error", "Please enter your license number.");
      return;
    }
    setLoading(true);
    try {
      await driversService.applyAsDriver({ licenseNumber });
      Alert.alert("Success", "Driver application submitted!");
      setLicenseNumber("");
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message || "Failed to apply as driver.");
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
      <TouchableOpacity
        style={styles.button}
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
  },
  title: {
    fontSize: 20,
    color: "#222",
    fontWeight: "bold",
    marginBottom: 24,
  },
  input: {
    width: "80%",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
    backgroundColor: "#f9f9f9",
  },
  button: {
    backgroundColor: "#11796F",
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
