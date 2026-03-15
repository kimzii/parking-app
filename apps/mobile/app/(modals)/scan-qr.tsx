import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as reservationsService from "../../src/services/reservations";

type ScanMode = "entry" | "exit";

export default function ScanQRScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [scanMode, setScanMode] = useState<ScanMode>("entry");
  const [manualCode, setManualCode] = useState("");
  const [showManualInput, setShowManualInput] = useState(false);
  const [lastResult, setLastResult] =
    useState<reservationsService.ScanResponse | null>(null);

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission]);

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned || processing) return;
    setScanned(true);
    await processQRCode(data);
  };

  const processQRCode = async (code: string) => {
    setProcessing(true);
    try {
      let result: reservationsService.ScanResponse;

      if (scanMode === "entry") {
        result = await reservationsService.scanEntry(code);
      } else {
        result = await reservationsService.scanExit(code);
      }

      setLastResult(result);

      // Show success
      const title =
        scanMode === "entry" ? "Entry Verified ✓" : "Exit Verified ✓";
      let message = result.message;

      if (result.driver) {
        message += `\n\nDriver: ${result.driver.name}`;
        if (result.driver.vehicle) {
          message += `\nVehicle: ${result.driver.vehicle.brand || ""} ${result.driver.vehicle.model || ""} (${result.driver.vehicle.plateNumber || "N/A"})`;
        }
      }

      if (scanMode === "exit" && result.additionalCharge) {
        message += `\n\nAdditional charge: ₱${result.additionalCharge.toFixed(2)}`;
      }

      Alert.alert(title, message, [
        { text: "OK", onPress: () => resetScanner() },
      ]);
    } catch (err: any) {
      const message = err.response?.data?.message || "Failed to verify QR code";
      Alert.alert("Verification Failed", message, [
        { text: "Try Again", onPress: () => resetScanner() },
      ]);
    } finally {
      setProcessing(false);
    }
  };

  const handleManualSubmit = async () => {
    if (!manualCode.trim()) {
      Alert.alert("Error", "Please enter a QR code");
      return;
    }
    await processQRCode(manualCode.trim().toUpperCase());
  };

  const resetScanner = () => {
    setScanned(false);
    setManualCode("");
    setLastResult(null);
  };

  if (!permission) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "left", "right", "bottom"]}>
        <Stack.Screen options={{ title: "Scan QR Code" }} />
        <ActivityIndicator
          size="large"
          color="#11796F"
          style={{ marginTop: 60 }}
        />
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "left", "right", "bottom"]}>
        <Stack.Screen options={{ title: "Scan QR Code" }} />
        <View style={styles.permissionContainer}>
          <MaterialIcons name="camera-alt" size={64} color="#C7C7CC" />
          <Text style={styles.permissionTitle}>Camera Permission Required</Text>
          <Text style={styles.permissionText}>
            We need camera access to scan driver QR codes
          </Text>
          <TouchableOpacity
            style={styles.permissionBtn}
            onPress={requestPermission}
          >
            <Text style={styles.permissionBtnText}>Grant Permission</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.manualEntryLink}
            onPress={() => setShowManualInput(true)}
          >
            <Text style={styles.manualEntryLinkText}>
              Or enter code manually
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right", "bottom"]}>
      <Stack.Screen options={{ title: "Scan QR Code" }} />

      {/* Mode Toggle */}
      <View style={styles.modeToggle}>
        <TouchableOpacity
          style={[styles.modeBtn, scanMode === "entry" && styles.modeBtnActive]}
          onPress={() => {
            setScanMode("entry");
            resetScanner();
          }}
        >
          <MaterialIcons
            name="login"
            size={20}
            color={scanMode === "entry" ? "#fff" : "#11796F"}
          />
          <Text
            style={[
              styles.modeBtnText,
              scanMode === "entry" && styles.modeBtnTextActive,
            ]}
          >
            Entry Scan
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeBtn, scanMode === "exit" && styles.modeBtnActive]}
          onPress={() => {
            setScanMode("exit");
            resetScanner();
          }}
        >
          <MaterialIcons
            name="logout"
            size={20}
            color={scanMode === "exit" ? "#fff" : "#11796F"}
          />
          <Text
            style={[
              styles.modeBtnText,
              scanMode === "exit" && styles.modeBtnTextActive,
            ]}
          >
            Exit Scan
          </Text>
        </TouchableOpacity>
      </View>

      {showManualInput ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.manualInputContainer}
        >
          <View style={styles.manualInputCard}>
            <Text style={styles.manualInputTitle}>Enter QR Code</Text>
            <TextInput
              style={styles.manualInput}
              value={manualCode}
              onChangeText={setManualCode}
              placeholder="PKL-XXXXXXXX-XXXX"
              placeholderTextColor="#C7C7CC"
              autoCapitalize="characters"
              autoCorrect={false}
            />
            <View style={styles.manualInputButtons}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  setShowManualInput(false);
                  setManualCode("");
                }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  processing && styles.submitBtnDisabled,
                ]}
                onPress={handleManualSubmit}
                disabled={processing}
              >
                {processing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>Verify</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      ) : (
        <>
          {/* Camera Scanner */}
          <View style={styles.cameraContainer}>
            <CameraView
              style={styles.camera}
              facing="back"
              barcodeScannerSettings={{
                barcodeTypes: ["qr"],
              }}
              onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            />

            {/* Overlay */}
            <View style={styles.overlay}>
              <View style={styles.scanFrame}>
                <View style={[styles.corner, styles.topLeft]} />
                <View style={[styles.corner, styles.topRight]} />
                <View style={[styles.corner, styles.bottomLeft]} />
                <View style={[styles.corner, styles.bottomRight]} />
              </View>
            </View>

            {/* Processing Indicator */}
            {processing && (
              <View style={styles.processingOverlay}>
                <ActivityIndicator size="large" color="#fff" />
                <Text style={styles.processingText}>Verifying...</Text>
              </View>
            )}
          </View>

          {/* Instructions */}
          <View style={styles.instructions}>
            <MaterialIcons
              name={
                scanMode === "entry" ? "qr-code-scanner" : "qr-code-scanner"
              }
              size={24}
              color="#11796F"
            />
            <Text style={styles.instructionsText}>
              {scanMode === "entry"
                ? "Scan driver's QR code to check them in"
                : "Scan driver's QR code to check them out"}
            </Text>
          </View>

          {/* Manual Entry Button */}
          <TouchableOpacity
            style={styles.manualEntryBtn}
            onPress={() => setShowManualInput(true)}
          >
            <MaterialIcons name="keyboard" size={20} color="#11796F" />
            <Text style={styles.manualEntryBtnText}>Enter Code Manually</Text>
          </TouchableOpacity>

          {/* Scan Again Button */}
          {scanned && !processing && (
            <TouchableOpacity
              style={styles.scanAgainBtn}
              onPress={resetScanner}
            >
              <MaterialIcons name="refresh" size={20} color="#fff" />
              <Text style={styles.scanAgainBtnText}>Scan Again</Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFB" },

  // Permission
  permissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
    gap: 12,
  },
  permissionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A2E",
    marginTop: 16,
  },
  permissionText: { fontSize: 14, color: "#8E8E93", textAlign: "center" },
  permissionBtn: {
    backgroundColor: "#11796F",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 20,
  },
  permissionBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  manualEntryLink: { marginTop: 16 },
  manualEntryLinkText: { color: "#11796F", fontSize: 14, fontWeight: "600" },

  // Mode Toggle
  modeToggle: {
    flexDirection: "row",
    padding: 16,
    gap: 12,
  },
  modeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#fff",
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#11796F",
  },
  modeBtnActive: {
    backgroundColor: "#11796F",
  },
  modeBtnText: { fontSize: 15, fontWeight: "700", color: "#11796F" },
  modeBtnTextActive: { color: "#fff" },

  // Camera
  cameraContainer: {
    flex: 1,
    marginHorizontal: 16,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#000",
  },
  camera: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  scanFrame: {
    width: 250,
    height: 250,
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: 40,
    height: 40,
    borderColor: "#11796F",
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 12,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 12,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 12,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 12,
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  processingText: { color: "#fff", fontSize: 16, fontWeight: "600" },

  // Instructions
  instructions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 20,
  },
  instructionsText: { fontSize: 14, color: "#666", textAlign: "center" },

  // Manual Entry Button
  manualEntryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  manualEntryBtnText: { fontSize: 15, fontWeight: "600", color: "#11796F" },

  // Scan Again
  scanAgainBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#11796F",
  },
  scanAgainBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },

  // Manual Input
  manualInputContainer: { flex: 1, justifyContent: "center", padding: 20 },
  manualInputCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  manualInputTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A2E",
    marginBottom: 16,
  },
  manualInput: {
    backgroundColor: "#F8FAFB",
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    fontWeight: "600",
    color: "#1A1A2E",
    textAlign: "center",
    letterSpacing: 2,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  manualInputButtons: { flexDirection: "row", gap: 12, marginTop: 20 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
  },
  cancelBtnText: { fontSize: 15, fontWeight: "600", color: "#666" },
  submitBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#11796F",
    alignItems: "center",
  },
  submitBtnDisabled: { backgroundColor: "#9E9E9E" },
  submitBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },
});
