import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
} from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { userService } from "../../src/services/user";

export default function CompleteProfileScreen() {
  const { role } = useLocalSearchParams<{ role: string }>();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showSourcePicker, setShowSourcePicker] = useState(false);

  const openCamera = async () => {
    setShowSourcePicker(false);
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please allow camera access.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const openGallery = async () => {
    setShowSourcePicker(false);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please allow access to your photo library.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const handleContinue = async () => {
    setSaving(true);
    try {
      if (selectedImage) {
        const result = await userService.uploadProfilePicture(selectedImage);
        await userService.updateProfile({ profilePicture: result.url });
      }

      if (role === "DRIVER") {
        router.replace("/(auth)/driver-setup");
      } else {
        router.replace("/(host-tabs)" as any);
      }
    } catch {
      Alert.alert("Error", "Failed to save profile picture. Please try again.");
    } finally {
      setSaving(false);
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
        <View style={styles.header}>
          <Text style={styles.title}>Add a Profile Photo</Text>
          <Text style={styles.subtitle}>
            Help others recognise you — you can skip this for now
          </Text>
        </View>

        <TouchableOpacity
          style={styles.avatarContainer}
          onPress={() => setShowSourcePicker(true)}
          activeOpacity={0.8}
        >
          {selectedImage ? (
            <Image source={{ uri: selectedImage }} style={styles.avatar} contentFit="cover" />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={44} color="#C7C7CC" />
            </View>
          )}
          <View style={styles.cameraIcon}>
            <Ionicons name="camera" size={16} color="#fff" />
          </View>
        </TouchableOpacity>

        <Text style={styles.tapHint}>Tap to choose a photo</Text>

        <TouchableOpacity
          style={[styles.button, saving && styles.buttonDisabled]}
          onPress={handleContinue}
          disabled={saving}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>
              {selectedImage ? "Save & Continue" : "Skip for Now"}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Source picker bottom sheet */}
      <Modal
        visible={showSourcePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSourcePicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSourcePicker(false)}
        >
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Choose Photo</Text>

            <TouchableOpacity style={styles.sheetOption} onPress={openCamera} activeOpacity={0.7}>
              <View style={styles.sheetIconBg}>
                <Ionicons name="camera" size={22} color="#D4501E" />
              </View>
              <View>
                <Text style={styles.sheetOptionTitle}>Take a Photo</Text>
                <Text style={styles.sheetOptionSub}>Use your camera</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.sheetOption} onPress={openGallery} activeOpacity={0.7}>
              <View style={styles.sheetIconBg}>
                <Ionicons name="images" size={22} color="#D4501E" />
              </View>
              <View>
                <Text style={styles.sheetOptionTitle}>Choose from Gallery</Text>
                <Text style={styles.sheetOptionSub}>Pick from your photo library</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sheetCancel}
              onPress={() => setShowSourcePicker(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 40,
    alignItems: "center",
  },
  header: { alignItems: "center", marginBottom: 32 },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#232230",
    letterSpacing: -0.5,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#A09A94",
    marginTop: 6,
    textAlign: "center",
    lineHeight: 20,
  },
  avatarContainer: { alignSelf: "center", marginBottom: 12 },
  avatar: {
    width: 130,
    height: 130,
    borderRadius: 40,
    backgroundColor: "#E8ECF0",
    borderWidth: 3,
    borderColor: "#fff",
  },
  avatarPlaceholder: {
    width: 130,
    height: 130,
    borderRadius: 40,
    backgroundColor: "#E8ECF0",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#fff",
  },
  cameraIcon: {
    position: "absolute",
    bottom: 2,
    right: 2,
    backgroundColor: "#D4501E",
    width: 34,
    height: 34,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#fff",
    shadowColor: "#D4501E",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  tapHint: {
    fontSize: 13,
    color: "#A09A94",
    marginBottom: 40,
  },
  button: {
    backgroundColor: "#D4501E",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    width: "100%",
    shadowColor: "#D4501E",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonDisabled: { backgroundColor: "#C5C5C5", shadowOpacity: 0, elevation: 0 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  // Modal / bottom sheet
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 36,
    gap: 4,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E0E0E0",
    alignSelf: "center",
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#232230",
    marginBottom: 12,
  },
  sheetOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingVertical: 14,
    borderRadius: 14,
    paddingHorizontal: 4,
  },
  sheetIconBg: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#FFF0EC",
    justifyContent: "center",
    alignItems: "center",
  },
  sheetOptionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#232230",
  },
  sheetOptionSub: {
    fontSize: 12,
    color: "#A09A94",
    marginTop: 2,
  },
  sheetCancel: {
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#F5F4F2",
    alignItems: "center",
  },
  sheetCancelText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#A09A94",
  },
});
