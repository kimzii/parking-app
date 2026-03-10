import React, { useState, useEffect } from "react";
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
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { userService } from "../../src/services/user";
import { Ionicons } from "@expo/vector-icons";
import Feather from "@expo/vector-icons/Feather";

export default function UpdateProfileScreen() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      setLoading(true);
      const token = await SecureStore.getItemAsync("accessToken");
      if (token) {
        try {
          const data = await userService.getProfile();
          setFirstName(data.firstName || "");
          setLastName(data.lastName || "");
          setProfilePicture(data.profilePicture || null);
        } catch {
          Alert.alert("Error", "Failed to load profile.");
        }
      }
      setLoading(false);
    };
    fetchUser();
  }, []);

  const pickImage = async () => {
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
      setSelectedImage(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let uploadedUrl: string | undefined;
      if (selectedImage) {
        const result = await userService.uploadProfilePicture(selectedImage);
        uploadedUrl = result.url;
      }
      const profileData = {
        firstName,
        lastName,
        ...(uploadedUrl && { profilePicture: uploadedUrl }),
      };
      await userService.updateProfile(profileData);
      Alert.alert("Success", "Profile updated!");
      router.back();
    } catch {
      Alert.alert("Error", "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const displayImage = selectedImage || profilePicture;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#11796F" />
      </View>
    );
  }

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
          <Text style={styles.title}>Edit Profile</Text>
          <Text style={styles.subtitle}>Update your personal information</Text>
        </View>

        <TouchableOpacity style={styles.avatarContainer} onPress={pickImage} activeOpacity={0.8}>
          {displayImage ? (
            <Image source={{ uri: displayImage }} style={styles.avatar} contentFit="cover" />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={44} color="#C7C7CC" />
            </View>
          )}
          <View style={styles.cameraIcon}>
            <Ionicons name="camera" size={16} color="#fff" />
          </View>
        </TouchableOpacity>

        <View style={styles.form}>
          <Text style={styles.label}>First Name</Text>
          <View style={styles.inputContainer}>
            <Feather name="user" size={18} color="#8E8E93" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="First Name"
              placeholderTextColor="#aaa"
              value={firstName}
              onChangeText={setFirstName}
              autoCapitalize="words"
              autoCorrect={false}
              editable={!saving}
            />
          </View>

          <Text style={styles.label}>Last Name</Text>
          <View style={styles.inputContainer}>
            <Feather name="user" size={18} color="#8E8E93" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Last Name"
              placeholderTextColor="#aaa"
              value={lastName}
              onChangeText={setLastName}
              autoCapitalize="words"
              autoCorrect={false}
              editable={!saving}
            />
          </View>

          <TouchableOpacity
            style={[styles.button, saving && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Save Changes</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()} disabled={saving} activeOpacity={0.8}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFB" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F8FAFB" },
  scrollContent: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 24, paddingVertical: 40 },
  logoContainer: { alignItems: "center", marginBottom: 20 },
  title: { fontSize: 28, fontWeight: "800", color: "#1A1A2E", letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: "#8E8E93", marginTop: 4 },
  avatarContainer: { alignSelf: "center", marginBottom: 24 },
  avatar: {
    width: 110, height: 110, borderRadius: 34, backgroundColor: "#E8ECF0",
    borderWidth: 3, borderColor: "#fff",
  },
  avatarPlaceholder: {
    width: 110, height: 110, borderRadius: 34, backgroundColor: "#E8ECF0",
    justifyContent: "center", alignItems: "center",
    borderWidth: 3, borderColor: "#fff",
  },
  cameraIcon: {
    position: "absolute", bottom: 2, right: 2,
    backgroundColor: "#11796F", width: 34, height: 34, borderRadius: 12,
    justifyContent: "center", alignItems: "center",
    borderWidth: 3, borderColor: "#fff",
    shadowColor: "#11796F", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4,
  },
  form: {
    backgroundColor: "#fff", borderRadius: 20, padding: 24,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 16, elevation: 4,
  },
  label: { fontSize: 13, fontWeight: "600", color: "#1A1A2E", marginBottom: 8, marginTop: 14, textTransform: "uppercase", letterSpacing: 0.5 },
  inputContainer: {
    flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderColor: "#E8ECF0", borderRadius: 12, backgroundColor: "#F8FAFB",
  },
  inputIcon: { marginLeft: 14 },
  input: { flex: 1, paddingHorizontal: 12, paddingVertical: 14, fontSize: 15, color: "#1A1A2E" },
  button: {
    backgroundColor: "#11796F", paddingVertical: 16, borderRadius: 14, alignItems: "center", marginTop: 24,
    shadowColor: "#11796F", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 5,
  },
  buttonDisabled: { backgroundColor: "#A8D5D1", shadowOpacity: 0 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  cancelButton: {
    paddingVertical: 14, borderRadius: 14, alignItems: "center", marginTop: 10, backgroundColor: "#F2F2F7",
  },
  cancelText: { color: "#8E8E93", fontSize: 15, fontWeight: "600" },
});
