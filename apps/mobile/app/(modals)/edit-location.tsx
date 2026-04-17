import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Stack,
  router,
  useLocalSearchParams,
  useFocusEffect,
} from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import MapView, { Marker, Region, PROVIDER_GOOGLE } from "react-native-maps";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { hostService } from "../../src/services/hosts";

const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

export default function EditLocationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const mapRef = useRef<MapView>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Editable fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [pricePerHour, setPricePerHour] = useState("");
  const [address, setAddress] = useState("");
  const [marker, setMarker] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [region, setRegion] = useState<Region | null>(null);

  // Operating hours
  const [is24Hours, setIs24Hours] = useState(false);
  const [openHour, setOpenHour] = useState("8");
  const [openMinute, setOpenMinute] = useState("00");
  const [openPeriod, setOpenPeriod] = useState<"AM" | "PM">("AM");
  const [closeHour, setCloseHour] = useState("10");
  const [closeMinute, setCloseMinute] = useState("00");
  const [closePeriod, setClosePeriod] = useState<"AM" | "PM">("PM");
  const [allowParkAnywhere, setAllowParkAnywhere] = useState(false);

  // Images
  const [existingImages, setExistingImages] = useState<
    { id: string; imageUrl: string; isPrimary: boolean }[]
  >([]);
  const [newImages, setNewImages] = useState<string[]>([]);
  const [imagesChanged, setImagesChanged] = useState(false);

  // Accepted vehicles
  const [acceptedVehicles, setAcceptedVehicles] = useState<string[]>([
    "CAR",
    "MOTORCYCLE",
  ]);

  const toggleVehicleType = (type: string) => {
    setAcceptedVehicles((prev) => {
      if (prev.includes(type)) {
        if (prev.length === 1) return prev;
        return prev.filter((v) => v !== type);
      }
      return [...prev, type];
    });
  };

  // Original status for warning
  const [originalStatus, setOriginalStatus] = useState<string>("");

  const to24Hour = (hour: string, minute: string, period: "AM" | "PM") => {
    let h = parseInt(hour, 10);
    if (period === "PM" && h !== 12) h += 12;
    if (period === "AM" && h === 12) h = 0;
    return `${h.toString().padStart(2, "0")}:${minute.padStart(2, "0")}`;
  };

  const from24Hour = (time: string) => {
    const [hourStr, minuteStr] = time.split(":");
    let h = parseInt(hourStr, 10);
    const period: "AM" | "PM" = h >= 12 ? "PM" : "AM";
    if (h === 0) h = 12;
    else if (h > 12) h -= 12;
    return { hour: h.toString(), minute: minuteStr || "00", period };
  };

  const fetchLocation = useCallback(async () => {
    if (!id) return;
    try {
      const data = await hostService.getLocation(id);
      setTitle(data.title);
      setDescription(data.description || "");
      setPricePerHour(Number(data.basePricePerHour).toString());
      setAddress(data.address);
      setOriginalStatus(data.status);

      const lat = Number(data.latitude);
      const lng = Number(data.longitude);
      setMarker({ latitude: lat, longitude: lng });
      const newRegion: Region = {
        latitude: lat,
        longitude: lng,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      };
      setRegion(newRegion);

      setIs24Hours(data.is24Hours || false);
      setAllowParkAnywhere(!!data.allowParkAnywhere);
      if (data.openTime) {
        const open = from24Hour(data.openTime);
        setOpenHour(open.hour);
        setOpenMinute(open.minute);
        setOpenPeriod(open.period);
      }
      if (data.closeTime) {
        const close = from24Hour(data.closeTime);
        setCloseHour(close.hour);
        setCloseMinute(close.minute);
        setClosePeriod(close.period);
      }

      if (data.acceptedVehicles && data.acceptedVehicles.length > 0) {
        setAcceptedVehicles(data.acceptedVehicles);
      }
      setExistingImages(data.images || []);
    } catch (err) {
      console.error("Failed to fetch location:", err);
      Alert.alert("Error", "Failed to load location details.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      fetchLocation();
    }, [fetchLocation]),
  );

  const handleMapPress = async (e: any) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setMarker({ latitude, longitude });
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}`,
      );
      const data = await res.json();
      if (data.results?.[0]) {
        setAddress(data.results[0].formatted_address);
      }
    } catch {
      // Keep existing address
    }
  };

  const pickImages = async () => {
    const totalImages = existingImages.length + newImages.length;
    if (totalImages >= 5) {
      Alert.alert("Limit Reached", "Maximum 5 images allowed.");
      return;
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Required",
        "Please allow access to your photo library.",
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: 5 - totalImages,
      quality: 0.7,
    });
    if (!result.canceled && result.assets) {
      setNewImages((prev) =>
        [...prev, ...result.assets.map((a) => a.uri)].slice(
          0,
          5 - existingImages.length,
        ),
      );
      setImagesChanged(true);
    }
  };

  const takePhoto = async () => {
    const totalImages = existingImages.length + newImages.length;
    if (totalImages >= 5) {
      Alert.alert("Limit Reached", "Maximum 5 images allowed.");
      return;
    }
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "Please allow access to your camera.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!result.canceled && result.assets) {
      setNewImages((prev) => [...prev, result.assets[0].uri]);
      setImagesChanged(true);
    }
  };

  const removeExistingImage = (index: number) => {
    setExistingImages((prev) => prev.filter((_, i) => i !== index));
    setImagesChanged(true);
  };

  const removeNewImage = (index: number) => {
    setNewImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert("Missing Info", "Please enter a title.");
      return;
    }
    if (!pricePerHour || parseFloat(pricePerHour) <= 0) {
      Alert.alert("Missing Info", "Please enter a valid price per hour.");
      return;
    }
    const totalImages = existingImages.length + newImages.length;
    if (totalImages < 3) {
      Alert.alert("Required Images", "Please have at least 3 images.");
      return;
    }

    const showApprovalWarning = originalStatus === "APPROVED";

    const doSave = async () => {
      setSaving(true);
      try {
        let imageUrls: string[] | undefined;

        if (imagesChanged) {
          // Upload new local images
          let uploadedUrls: string[] = [];
          if (newImages.length > 0) {
            uploadedUrls = await hostService.uploadImages(
              newImages,
              title.trim(),
            );
          }
          // Combine existing image URLs with newly uploaded ones
          imageUrls = [
            ...existingImages.map((img) => img.imageUrl),
            ...uploadedUrls,
          ];
        }

        const openTime = to24Hour(openHour, openMinute, openPeriod);
        const closeTime = to24Hour(closeHour, closeMinute, closePeriod);

        await hostService.updateLocation(id, {
          title: title.trim(),
          description: description.trim() || undefined,
          basePricePerHour: parseFloat(pricePerHour),
          address,
          latitude: marker?.latitude,
          longitude: marker?.longitude,
          is24Hours: is24Hours || undefined,
          openTime: is24Hours ? undefined : openTime,
          closeTime: is24Hours ? undefined : closeTime,
          allowParkAnywhere: allowParkAnywhere || undefined,
          ...(imageUrls ? { imageUrls } : {}),
          acceptedVehicles,
        });

        Alert.alert(
          "Saved",
          showApprovalWarning
            ? "Your changes have been saved. Since the location was previously approved, it will need admin re-approval before it becomes visible again."
            : "Your changes have been saved successfully.",
          [{ text: "OK", onPress: () => router.back() }],
        );
      } catch (err: any) {
        const rawMsg = err?.response?.data?.message;
        const msg = Array.isArray(rawMsg)
          ? rawMsg.join(", ")
          : rawMsg || "Failed to save changes.";
        Alert.alert("Error", msg);
      } finally {
        setSaving(false);
      }
    };

    if (showApprovalWarning) {
      Alert.alert(
        "Re-approval Required",
        "Editing an approved location will set it back to pending. It will need admin approval again before drivers can see it.\n\nDo you want to continue?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Continue", onPress: doSave },
        ],
      );
    } else {
      doSave();
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["left", "right", "bottom"]}>
        <Stack.Screen options={{ title: "Edit Location" }} />
        <ActivityIndicator
          size="large"
          color="#D4501E"
          style={{ marginTop: 60 }}
        />
      </SafeAreaView>
    );
  }

  const totalImages = existingImages.length + newImages.length;

  return (
    <SafeAreaView style={styles.safeArea} edges={["left", "right", "bottom"]}>
      <Stack.Screen options={{ title: "Edit Location" }} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Re-approval Warning */}
          {originalStatus === "APPROVED" && (
            <View style={styles.warningBanner}>
              <MaterialIcons name="info" size={20} color="#D4501E" />
              <Text style={styles.warningText}>
                Editing this location will require admin re-approval before it
                becomes visible to drivers again.
              </Text>
            </View>
          )}

          {/* Title */}
          <Text style={styles.sectionTitle}>Location Details</Text>
          <View style={styles.card}>
            <Text style={styles.label}>Title</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Sunny Parking Lot"
              placeholderTextColor="#C7C7CC"
              value={title}
              onChangeText={setTitle}
            />

            <Text style={styles.label}>Description (optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe your parking space..."
              placeholderTextColor="#C7C7CC"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <Text style={styles.label}>Price per Hour (₱)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 50"
              placeholderTextColor="#C7C7CC"
              keyboardType="decimal-pad"
              value={pricePerHour}
              onChangeText={setPricePerHour}
            />
          </View>

          {/* Map */}
          <Text style={styles.sectionTitle}>Location on Map</Text>
          <View style={styles.card}>
            <View style={styles.mapContainer}>
              {region && (
                <MapView
                  ref={mapRef}
                  style={styles.map}
                  provider={PROVIDER_GOOGLE}
                  initialRegion={region}
                  onPress={handleMapPress}
                >
                  {marker && (
                    <Marker
                      coordinate={marker}
                      draggable
                      onDragEnd={handleMapPress}
                    />
                  )}
                </MapView>
              )}
            </View>
            {address ? (
              <View style={styles.addressRow}>
                <MaterialIcons name="location-on" size={16} color="#D4501E" />
                <Text style={styles.addressText} numberOfLines={2}>
                  {address}
                </Text>
              </View>
            ) : null}
            <Text style={styles.hintText}>
              Tap the map to update the pin location
            </Text>
          </View>

          {/* Accepted Vehicle Types */}
          <Text style={styles.sectionTitle}>Accepted Vehicles</Text>
          <View style={styles.card}>
            <Text style={styles.hintText}>
              Select which vehicle types can park here
            </Text>
            <View style={styles.vehicleTypeRow}>
              <TouchableOpacity
                style={[
                  styles.vehicleTypeBtn,
                  acceptedVehicles.includes("CAR") &&
                    styles.vehicleTypeBtnActive,
                ]}
                onPress={() => toggleVehicleType("CAR")}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name="directions-car"
                  size={24}
                  color={acceptedVehicles.includes("CAR") ? "#fff" : "#D4501E"}
                />
                <Text
                  style={[
                    styles.vehicleTypeText,
                    acceptedVehicles.includes("CAR") &&
                      styles.vehicleTypeTextActive,
                  ]}
                >
                  Cars
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.vehicleTypeBtn,
                  acceptedVehicles.includes("MOTORCYCLE") &&
                    styles.vehicleTypeBtnActive,
                ]}
                onPress={() => toggleVehicleType("MOTORCYCLE")}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name="two-wheeler"
                  size={24}
                  color={
                    acceptedVehicles.includes("MOTORCYCLE") ? "#fff" : "#D4501E"
                  }
                />
                <Text
                  style={[
                    styles.vehicleTypeText,
                    acceptedVehicles.includes("MOTORCYCLE") &&
                      styles.vehicleTypeTextActive,
                  ]}
                >
                  Motorcycles
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Parking Mode</Text>
          <View style={styles.card}>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Allow Park Anywhere</Text>
              <Switch
                value={allowParkAnywhere}
                onValueChange={setAllowParkAnywhere}
                trackColor={{ false: "#E0E0E0", true: "#A8D5D1" }}
                thumbColor={allowParkAnywhere ? "#D4501E" : "#fff"}
              />
            </View>
            <Text style={styles.hintText}>
              Drivers can book this location without selecting a specific slot.
            </Text>
          </View>

          {/* Operating Hours */}
          <Text style={styles.sectionTitle}>Operating Hours</Text>
          <View style={styles.card}>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Open 24 Hours</Text>
              <Switch
                value={is24Hours}
                onValueChange={setIs24Hours}
                trackColor={{ false: "#E0E0E0", true: "#A8D5D1" }}
                thumbColor={is24Hours ? "#D4501E" : "#fff"}
              />
            </View>

            {!is24Hours && (
              <View style={styles.hoursContainer}>
                <View style={styles.timePickerGroup}>
                  <Text style={styles.timeGroupLabel}>Opens</Text>
                  <View style={styles.timeRow}>
                    <TextInput
                      style={styles.timeInput}
                      keyboardType="number-pad"
                      maxLength={2}
                      value={openHour}
                      onChangeText={setOpenHour}
                    />
                    <Text style={styles.timeSep}>:</Text>
                    <TextInput
                      style={styles.timeInput}
                      keyboardType="number-pad"
                      maxLength={2}
                      value={openMinute}
                      onChangeText={setOpenMinute}
                    />
                    <TouchableOpacity
                      style={[
                        styles.periodBtn,
                        openPeriod === "AM" && styles.periodBtnActive,
                      ]}
                      onPress={() => setOpenPeriod("AM")}
                    >
                      <Text
                        style={[
                          styles.periodText,
                          openPeriod === "AM" && styles.periodTextActive,
                        ]}
                      >
                        AM
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.periodBtn,
                        openPeriod === "PM" && styles.periodBtnActive,
                      ]}
                      onPress={() => setOpenPeriod("PM")}
                    >
                      <Text
                        style={[
                          styles.periodText,
                          openPeriod === "PM" && styles.periodTextActive,
                        ]}
                      >
                        PM
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.timePickerGroup}>
                  <Text style={styles.timeGroupLabel}>Closes</Text>
                  <View style={styles.timeRow}>
                    <TextInput
                      style={styles.timeInput}
                      keyboardType="number-pad"
                      maxLength={2}
                      value={closeHour}
                      onChangeText={setCloseHour}
                    />
                    <Text style={styles.timeSep}>:</Text>
                    <TextInput
                      style={styles.timeInput}
                      keyboardType="number-pad"
                      maxLength={2}
                      value={closeMinute}
                      onChangeText={setCloseMinute}
                    />
                    <TouchableOpacity
                      style={[
                        styles.periodBtn,
                        closePeriod === "AM" && styles.periodBtnActive,
                      ]}
                      onPress={() => setClosePeriod("AM")}
                    >
                      <Text
                        style={[
                          styles.periodText,
                          closePeriod === "AM" && styles.periodTextActive,
                        ]}
                      >
                        AM
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.periodBtn,
                        closePeriod === "PM" && styles.periodBtnActive,
                      ]}
                      onPress={() => setClosePeriod("PM")}
                    >
                      <Text
                        style={[
                          styles.periodText,
                          closePeriod === "PM" && styles.periodTextActive,
                        ]}
                      >
                        PM
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* Images */}
          <Text style={styles.sectionTitle}>Images ({totalImages}/5)</Text>
          <View style={styles.card}>
            {/* Existing images */}
            {existingImages.length > 0 && (
              <View style={styles.imageGrid}>
                {existingImages.map((img, index) => (
                  <View key={img.id} style={styles.imageWrapper}>
                    <Image
                      source={{ uri: img.imageUrl }}
                      style={styles.imageThumb}
                      contentFit="cover"
                    />
                    {img.isPrimary && (
                      <View style={styles.primaryBadge}>
                        <Text style={styles.primaryBadgeText}>Primary</Text>
                      </View>
                    )}
                    <TouchableOpacity
                      style={styles.removeImageBtn}
                      onPress={() => removeExistingImage(index)}
                    >
                      <MaterialIcons name="close" size={16} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* New images */}
            {newImages.length > 0 && (
              <View style={styles.imageGrid}>
                {newImages.map((uri, index) => (
                  <View key={`new-${index}`} style={styles.imageWrapper}>
                    <Image
                      source={{ uri }}
                      style={styles.imageThumb}
                      contentFit="cover"
                    />
                    <View style={styles.newBadge}>
                      <Text style={styles.primaryBadgeText}>New</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.removeImageBtn}
                      onPress={() => removeNewImage(index)}
                    >
                      <MaterialIcons name="close" size={16} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {totalImages < 5 && (
              <View style={styles.imageActions}>
                <TouchableOpacity
                  style={styles.imageActionBtn}
                  onPress={pickImages}
                >
                  <MaterialIcons
                    name="photo-library"
                    size={20}
                    color="#D4501E"
                  />
                  <Text style={styles.imageActionText}>Gallery</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.imageActionBtn}
                  onPress={takePhoto}
                >
                  <MaterialIcons name="camera-alt" size={20} color="#D4501E" />
                  <Text style={styles.imageActionText}>Camera</Text>
                </TouchableOpacity>
              </View>
            )}

            <Text style={styles.hintText}>Minimum 3 images required</Text>
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <MaterialIcons name="save" size={20} color="#fff" />
                <Text style={styles.saveBtnText}>Save Changes</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#FFFFFF" },
  scrollContent: {
    padding: 16,
    paddingBottom: 60,
    gap: 12,
  },

  // Warning
  warningBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFF8E1",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: "#D4501E",
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: "#D4501E",
    fontWeight: "500",
    lineHeight: 18,
  },

  // Section
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#232230",
    marginTop: 4,
    marginLeft: 4,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  // Form
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#A09A94",
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: "#232230",
    borderWidth: 1,
    borderColor: "#E8ECF0",
  },
  textArea: {
    minHeight: 80,
  },
  hintText: {
    fontSize: 12,
    color: "#C7C7CC",
    marginTop: -4,
  },

  // Map
  mapContainer: {
    height: 200,
    borderRadius: 12,
    overflow: "hidden",
  },
  map: {
    flex: 1,
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  addressText: {
    flex: 1,
    fontSize: 13,
    color: "#666",
  },

  // Hours
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  switchLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#232230",
  },
  hoursContainer: {
    gap: 16,
  },
  timePickerGroup: {
    gap: 8,
  },
  timeGroupLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#A09A94",
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  timeInput: {
    width: 48,
    height: 44,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E8ECF0",
    textAlign: "center",
    fontSize: 18,
    fontWeight: "700",
    color: "#232230",
  },
  timeSep: {
    fontSize: 20,
    fontWeight: "700",
    color: "#232230",
  },
  periodBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#F5F5F5",
    borderWidth: 1,
    borderColor: "#E8ECF0",
  },
  periodBtnActive: {
    backgroundColor: "#D4501E",
    borderColor: "#D4501E",
  },
  periodText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#A09A94",
  },
  periodTextActive: {
    color: "#fff",
  },

  // Images
  imageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  imageWrapper: {
    width: 90,
    height: 90,
    borderRadius: 12,
    overflow: "hidden",
  },
  imageThumb: {
    width: "100%",
    height: "100%",
  },
  primaryBadge: {
    position: "absolute",
    bottom: 4,
    left: 4,
    backgroundColor: "#D4501E",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  newBadge: {
    position: "absolute",
    bottom: 4,
    left: 4,
    backgroundColor: "rgba(25,118,210,0.85)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  primaryBadgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "700",
  },
  removeImageBtn: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  imageActions: {
    flexDirection: "row",
    gap: 10,
  },
  imageActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFF0EC",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  imageActionText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#D4501E",
  },

  // Save Button
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#D4501E",
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 8,
    shadowColor: "#D4501E",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  saveBtnDisabled: {
    backgroundColor: "#A8D5D1",
    shadowOpacity: 0,
  },
  saveBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  vehicleTypeRow: {
    flexDirection: "row",
    gap: 10,
  },
  vehicleTypeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#FFF0EC",
    borderWidth: 2,
    borderColor: "#FFF0EC",
  },
  vehicleTypeBtnActive: {
    backgroundColor: "#D4501E",
    borderColor: "#D4501E",
  },
  vehicleTypeText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#D4501E",
  },
  vehicleTypeTextActive: {
    color: "#fff",
  },
});
