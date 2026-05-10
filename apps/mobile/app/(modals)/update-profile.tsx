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
  Modal,
} from "react-native";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { userService } from "../../src/services/user";
import { Ionicons } from "@expo/vector-icons";
import Feather from "@expo/vector-icons/Feather";

const parseDateFromApi = (value?: string | null): Date | null => {
  if (!value) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    const parsed = new Date(year, month - 1, day);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

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

export default function UpdateProfileScreen() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [sex, setSex] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);
  const [showBirthdayPicker, setShowBirthdayPicker] = useState(false);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showSourcePicker, setShowSourcePicker] = useState(false);
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
          setPhoneNumber(data.phoneNumber || "");
          setSex(data.sex || "");
          setDateOfBirth(parseDateFromApi(data.dateOfBirth));
          setProfilePicture(data.profilePicture || null);
        } catch {
          Alert.alert("Error", "Failed to load profile.");
        }
      }
      setLoading(false);
    };
    fetchUser();
  }, []);

  const closeSourcePickerBeforeNativeUi = async () => {
    setShowSourcePicker(false);
    await new Promise((resolve) => setTimeout(resolve, 180));
  };

  const cropToSquare = async (asset: ImagePicker.ImagePickerAsset) => {
    const width = asset.width ?? 0;
    const height = asset.height ?? 0;

    if (!width || !height) {
      return asset.uri;
    }

    const size = Math.min(width, height);
    const originX = Math.floor((width - size) / 2);
    const originY = Math.floor((height - size) / 2);

    const manipulated = await ImageManipulator.manipulateAsync(
      asset.uri,
      [
        { crop: { originX, originY, width: size, height: size } },
        { resize: { width: 1024, height: 1024 } },
      ],
      { compress: 0.82, format: ImageManipulator.SaveFormat.JPEG },
    );

    return manipulated.uri;
  };

  const openCamera = async () => {
    await closeSourcePickerBeforeNativeUi();
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please allow camera access.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: "images",
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const croppedUri = await cropToSquare(result.assets[0]);
      setSelectedImage(croppedUri);
    }
  };

  const handleBirthdayChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date,
  ) => {
    if (Platform.OS === "android") {
      setShowBirthdayPicker(false);
    }

    if (event.type === "dismissed") return;
    if (selectedDate) {
      setDateOfBirth(selectedDate);
    }
  };

  const handleSave = async () => {
    const birthdayValue = dateOfBirth ? formatDateForApi(dateOfBirth) : "";

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
        phoneNumber,
        sex,
        dateOfBirth: birthdayValue || undefined,
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
        <ActivityIndicator size="large" color="#D4501E" />
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

        <TouchableOpacity
          style={styles.avatarContainer}
          onPress={() => !saving && setShowSourcePicker(true)}
          activeOpacity={0.8}
        >
          {displayImage ? (
            <Image
              source={{ uri: displayImage }}
              style={styles.avatar}
              contentFit="cover"
            />
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
              editable={!saving}
            />
          </View>

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
              editable={!saving}
            />
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
                disabled={saving}
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
            onPress={() => !saving && setShowBirthdayPicker(true)}
            activeOpacity={0.7}
            disabled={saving}
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
                styles.dateValueText,
                !dateOfBirth && styles.datePlaceholderText,
              ]}
            >
              {dateOfBirth
                ? formatDateForDisplay(dateOfBirth)
                : "Tap to select birthday"}
            </Text>
          </TouchableOpacity>

          {showBirthdayPicker && (
            <View style={styles.datePickerBox}>
              <DateTimePicker
                value={dateOfBirth ?? new Date(2000, 0, 1)}
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
              editable={!saving}
            />
          </View>

          <TouchableOpacity
            style={[styles.button, saving && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Save Changes</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => router.back()}
            disabled={saving}
            activeOpacity={0.8}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

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

            <TouchableOpacity
              style={styles.sheetOption}
              onPress={openCamera}
              activeOpacity={0.7}
            >
              <View style={styles.sheetIconBg}>
                <Ionicons name="camera" size={22} color="#D4501E" />
              </View>
              <View>
                <Text style={styles.sheetOptionTitle}>Take a Photo</Text>
                <Text style={styles.sheetOptionSub}>Use your camera</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  logoContainer: { alignItems: "center", marginBottom: 20 },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#232230",
    letterSpacing: -0.5,
  },
  subtitle: { fontSize: 14, color: "#A09A94", marginTop: 4 },
  avatarContainer: { alignSelf: "center", marginBottom: 24 },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 34,
    backgroundColor: "#E8ECF0",
    borderWidth: 3,
    borderColor: "#fff",
  },
  avatarPlaceholder: {
    width: 110,
    height: 110,
    borderRadius: 34,
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
    paddingBottom: 48,
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
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    backgroundColor: "#F2F2F7",
  },
  sheetCancelText: {
    color: "#6B7280",
    fontSize: 15,
    fontWeight: "700",
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
  inputIcon: { marginLeft: 14 },
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
  buttonDisabled: { backgroundColor: "#A8D5D1", shadowOpacity: 0 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  cancelButton: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 10,
    backgroundColor: "#F2F2F7",
  },
  cancelText: { color: "#A09A94", fontSize: 15, fontWeight: "600" },
  sexRow: { flexDirection: "row", gap: 10 },
  sexButton: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#E8ECF0",
    backgroundColor: "#FFFFFF",
  },
  sexButtonSelected: { backgroundColor: "#FFF0EC", borderColor: "#D4501E" },
  sexButtonText: { fontSize: 14, fontWeight: "600", color: "#232230" },
  sexButtonTextSelected: { color: "#D4501E" },
});
