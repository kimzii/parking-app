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
import * as reservationsService from "../../src/services/reservations";

type ScanMode = "entry" | "exit";

// Dynamically load expo-camera — falls back gracefully if native module not compiled in APK
let CameraView: any = null;
let useCameraPermissions: any = null;
try {
  const cam = require("expo-camera");
  CameraView = cam.CameraView;
  useCameraPermissions = cam.useCameraPermissions;
} catch {
  // Native module not available in this build
}

function CameraScanner({
  scanned,
  onBarcodeScanned,
  processing,
}: {
  scanned: boolean;
  onBarcodeScanned: (result: { data: string }) => void;
  processing: boolean;
}) {
  const [permission, requestPermission] = useCameraPermissions?.() ?? [null, () => {}];

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission]);

  if (!permission) {
    return (
      <View style={styles.cameraContainer}>
        <ActivityIndicator size="large" color="#D4501E" style={{ flex: 1 }} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <MaterialIcons name="camera-alt" size={64} color="#C7C7CC" />
        <Text style={styles.permissionTitle}>Camera Permission Required</Text>
        <Text style={styles.permissionText}>
          We need camera access to scan driver QR codes
        </Text>
        <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
          <Text style={styles.permissionBtnText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.cameraContainer}>
      <CameraView
        style={styles.camera}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={scanned ? undefined : onBarcodeScanned}
      />
      <View style={styles.overlay}>
        <View style={styles.scanFrame}>
          <View style={[styles.corner, styles.topLeft]} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />
        </View>
      </View>
      {processing && (
        <View style={styles.processingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.processingText}>Verifying...</Text>
        </View>
      )}
    </View>
  );
}

export default function ScanQRScreen() {
  const [scanned, setScanned] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [scanMode, setScanMode] = useState<ScanMode>("entry");
  const [manualCode, setManualCode] = useState("");
  const [showManualInput, setShowManualInput] = useState(!CameraView);

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned || processing) return;
    setScanned(true);
    await processQRCode(data);
  };

  const processQRCode = async (code: string, force = false) => {
    setProcessing(true);
    try {
      let result: reservationsService.ScanResponse;

      if (scanMode === "entry") {
        result = await reservationsService.scanEntry(code, force);
      } else {
        result = await reservationsService.scanExit(code);
      }

      // Soft proximity warning — ask host to confirm
      if (result.warning) {
        setProcessing(false);
        Alert.alert(
          "Driver Not Detected Nearby",
          result.message,
          [
            { text: "Cancel", style: "cancel", onPress: () => resetScanner() },
            {
              text: "Proceed Anyway",
              style: "destructive",
              onPress: () => processQRCode(code, true),
            },
          ],
        );
        return;
      }

      // Fetch full reservation then navigate to detail
      try {
        const all = await reservationsService.getHostReservations();
        const full = all.find((r) => r.id === result.reservation.id);
        if (full) {
          router.replace({
            pathname: "/(modals)/host-reservation-detail",
            params: { reservation: JSON.stringify(full) },
          } as any);
          return;
        }
      } catch {}

      // Fallback: show alert if reservation fetch fails
      const title =
        scanMode === "entry" ? "Entry Verified \u2713" : "Exit Verified \u2713";
      Alert.alert(title, result.message, [
        { text: "OK", onPress: () => resetScanner() },
      ]);
    } catch (err: any) {
      const message =
        err.response?.data?.message || "Failed to verify QR code";
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
    await processQRCode(manualCode.trim());
  };

  const resetScanner = () => {
    setScanned(false);
    setManualCode("");
  };

  return (
    <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
      <Stack.Screen options={{ title: "Scan QR Code" }} />

      {/* Mode Toggle */}
      <View style={styles.modeToggle}>
        <TouchableOpacity
          style={[
            styles.modeBtn,
            scanMode === "entry" && styles.modeBtnActive,
          ]}
          onPress={() => {
            setScanMode("entry");
            resetScanner();
          }}
        >
          <MaterialIcons
            name="login"
            size={20}
            color={scanMode === "entry" ? "#fff" : "#D4501E"}
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
          style={[
            styles.modeBtn,
            scanMode === "exit" && styles.modeBtnActive,
          ]}
          onPress={() => {
            setScanMode("exit");
            resetScanner();
          }}
        >
          <MaterialIcons
            name="logout"
            size={20}
            color={scanMode === "exit" ? "#fff" : "#D4501E"}
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
              {CameraView && (
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => {
                    setShowManualInput(false);
                    setManualCode("");
                  }}
                >
                  <Text style={styles.cancelBtnText}>Use Camera</Text>
                </TouchableOpacity>
              )}
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
          <CameraScanner
            scanned={scanned}
            onBarcodeScanned={handleBarCodeScanned}
            processing={processing}
          />

          {/* Instructions */}
          <View style={styles.instructions}>
            <MaterialIcons name="qr-code-scanner" size={24} color="#D4501E" />
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
            <MaterialIcons name="keyboard" size={20} color="#D4501E" />
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
  container: { flex: 1, backgroundColor: "#FFFFFF" },

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
    color: "#232230",
    marginTop: 16,
  },
  permissionText: { fontSize: 14, color: "#A09A94", textAlign: "center" },
  permissionBtn: {
    backgroundColor: "#D4501E",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 20,
  },
  permissionBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },

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
    borderColor: "#D4501E",
  },
  modeBtnActive: {
    backgroundColor: "#D4501E",
  },
  modeBtnText: { fontSize: 15, fontWeight: "700", color: "#D4501E" },
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
    borderColor: "#D4501E",
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
  manualEntryBtnText: { fontSize: 15, fontWeight: "600", color: "#D4501E" },

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
    backgroundColor: "#D4501E",
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
    color: "#232230",
    marginBottom: 16,
  },
  manualInput: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    fontWeight: "600",
    color: "#232230",
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
    backgroundColor: "#D4501E",
    alignItems: "center",
  },
  submitBtnDisabled: { backgroundColor: "#9E9E9E" },
  submitBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },
});
