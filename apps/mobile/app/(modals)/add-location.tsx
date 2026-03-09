import React, { useState, useRef, useEffect } from "react";
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
import { router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import MapView, { Marker, Region, PROVIDER_GOOGLE } from "react-native-maps";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { hostService } from "../../src/services/hosts";

const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

const DEFAULT_REGION: Region = {
  latitude: 14.5995,
  longitude: 120.9842,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
};

export default function AddLocationScreen() {
  const mapRef = useRef<MapView>(null);
  const [region, setRegion] = useState<Region>(DEFAULT_REGION);
  const [marker, setMarker] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [address, setAddress] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [pricePerHour, setPricePerHour] = useState("");
  const [totalSlots, setTotalSlots] = useState("");
  const [isMultiLevel, setIsMultiLevel] = useState(false);
  const [numberOfLevels, setNumberOfLevels] = useState("");
  const [levelSlots, setLevelSlots] = useState<string[]>([]);
  const [useCustomNames, setUseCustomNames] = useState(false);
  const [customNames, setCustomNames] = useState<string[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [proofOfResidence, setProofOfResidence] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);

  // Convert level number to letter prefix: 1→A, 2→B, ..., 26→Z
  const levelToPrefix = (level: number): string => {
    let result = "";
    let n = level;
    while (n > 0) {
      n--;
      result = String.fromCharCode(65 + (n % 26)) + result;
      n = Math.floor(n / 26);
    }
    return result;
  };

  // Generate auto-names from levelSlots config
  const getAutoNames = (): string[] => {
    const names: string[] = [];
    if (isMultiLevel) {
      levelSlots.forEach((slotsStr, idx) => {
        const count = parseInt(slotsStr, 10) || 0;
        const prefix = levelToPrefix(idx + 1);
        for (let i = 1; i <= count; i++) {
          names.push(`${prefix}${i}`);
        }
      });
    } else {
      const count = parseInt(totalSlots, 10) || 0;
      for (let i = 1; i <= count; i++) {
        names.push(`A${i}`);
      }
    }
    return names;
  };

  // When number of levels changes, resize levelSlots array
  const handleLevelsChange = (val: string) => {
    setNumberOfLevels(val);
    const count = parseInt(val, 10) || 0;
    setLevelSlots((prev) => {
      const next = [...prev];
      while (next.length < count) next.push("");
      return next.slice(0, count);
    });
    setCustomNames([]);
    setUseCustomNames(false);
  };

  // Update slot count for a specific level
  const handleLevelSlotChange = (levelIdx: number, val: string) => {
    setLevelSlots((prev) => {
      const next = [...prev];
      next[levelIdx] = val;
      return next;
    });
    setCustomNames([]);
  };

  // Compute total from levelSlots
  const multiTotalSlots = levelSlots.reduce(
    (sum, s) => sum + (parseInt(s, 10) || 0),
    0,
  );

  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocating(false);
        return;
      }
      const location = await Location.getCurrentPositionAsync({});
      const newRegion: Region = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      };
      setRegion(newRegion);
      mapRef.current?.animateToRegion(newRegion, 500);
    } catch {
      console.error("Failed to get location");
    } finally {
      setLocating(false);
    }
  };

  const handleMapPress = async (e: any) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setMarker({ latitude, longitude });
    reverseGeocode(latitude, longitude);
  };

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}`,
      );
      const data = await res.json();
      if (data.results?.[0]) {
        setAddress(data.results[0].formatted_address);
      }
    } catch {
      console.error("Reverse geocode failed");
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(searchQuery)}&key=${GOOGLE_MAPS_API_KEY}`,
      );
      const data = await res.json();
      if (data.results?.[0]) {
        const { lat, lng } = data.results[0].geometry.location;
        const newRegion: Region = {
          latitude: lat,
          longitude: lng,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        };
        setRegion(newRegion);
        setMarker({ latitude: lat, longitude: lng });
        setAddress(data.results[0].formatted_address);
        mapRef.current?.animateToRegion(newRegion, 500);
      } else {
        Alert.alert("Not Found", "Could not find that location.");
      }
    } catch {
      Alert.alert("Error", "Search failed. Please try again.");
    }
  };

  const pickImages = async () => {
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
      selectionLimit: 5 - images.length,
      quality: 0.7,
    });

    if (!result.canceled && result.assets) {
      const newUris = result.assets.map((a) => a.uri);
      setImages((prev) => [...prev, ...newUris].slice(0, 5));
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "Please allow access to your camera.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7,
    });

    if (!result.canceled && result.assets) {
      setImages((prev) => [...prev, result.assets[0].uri].slice(0, 5));
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const pickProofOfResidence = async () => {
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
      allowsMultipleSelection: false,
      quality: 0.7,
    });

    if (!result.canceled && result.assets?.[0]) {
      setProofOfResidence(result.assets[0].uri);
    }
  };

  const takeProofOfResidencePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "Please allow access to your camera.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7,
    });

    if (!result.canceled && result.assets?.[0]) {
      setProofOfResidence(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert("Missing Info", "Please enter a title.");
      return;
    }
    if (!marker) {
      Alert.alert(
        "Missing Location",
        "Please tap the map to select a location.",
      );
      return;
    }
    if (!pricePerHour || parseFloat(pricePerHour) <= 0) {
      Alert.alert("Missing Info", "Please enter a valid price per hour.");
      return;
    }
    if (images.length < 3) {
      Alert.alert(
        "Required Images",
        "Please upload at least 3 images: Entrance, Parking Spot, and Street View.",
      );
      return;
    }
    if (!proofOfResidence) {
      Alert.alert(
        "Missing Proof of Residence",
        "Please upload a proof of residence document.",
      );
      return;
    }
    if (isMultiLevel && (!numberOfLevels || parseInt(numberOfLevels, 10) < 1)) {
      Alert.alert("Missing Info", "Please enter the number of levels.");
      return;
    }
    if (isMultiLevel && levelSlots.some((s) => !s || parseInt(s, 10) < 1)) {
      Alert.alert("Missing Info", "Please enter slots for each level.");
      return;
    }

    setLoading(true);
    try {
      // Upload images to S3 first
      let uploadedImageUrls: string[] | undefined;
      if (images.length > 0) {
        uploadedImageUrls = await hostService.uploadImages(images);
      }

      // Upload proof of residence to S3
      let proofOfResidenceUrl: string | undefined;
      if (proofOfResidence) {
        proofOfResidenceUrl =
          await hostService.uploadProofOfResidence(proofOfResidence);
      }

      const parsedLevelSlots = isMultiLevel
        ? levelSlots.map((s) => parseInt(s, 10))
        : undefined;
      const autoNames = getAutoNames();
      const finalNames = useCustomNames ? customNames : autoNames;

      await hostService.createLocation({
        title: title.trim(),
        address: address || "No address",
        latitude: marker.latitude,
        longitude: marker.longitude,
        basePricePerHour: parseFloat(pricePerHour),
        description: description.trim() || undefined,
        totalSlots: isMultiLevel
          ? multiTotalSlots
          : totalSlots
            ? parseInt(totalSlots, 10)
            : undefined,
        isMultiLevel: isMultiLevel || undefined,
        numberOfLevels: isMultiLevel ? parseInt(numberOfLevels, 10) : undefined,
        levelSlots: parsedLevelSlots,
        spaceNames: finalNames.length > 0 ? finalNames : undefined,
        imageUrls: uploadedImageUrls,
        proofOfResidenceUrl,
      });
      Alert.alert("Success", "Parking location created successfully!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err: any) {
      const rawMsg = err?.response?.data?.message;
      const msg = Array.isArray(rawMsg)
        ? rawMsg.join(", ")
        : rawMsg || "Failed to create location.";
      Alert.alert("Error", msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Search Bar */}
          <View style={styles.searchBar}>
            <MaterialIcons name="search" size={20} color="#8E8E93" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search for an address..."
              placeholderTextColor="#C7C7CC"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
            {searchQuery ? (
              <TouchableOpacity onPress={handleSearch}>
                <MaterialIcons name="arrow-forward" size={20} color="#11796F" />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Map */}
          <View style={styles.mapContainer}>
            <MapView
              ref={mapRef}
              style={styles.map}
              provider={PROVIDER_GOOGLE}
              initialRegion={region}
              onPress={handleMapPress}
              showsUserLocation
              showsMyLocationButton={false}
            >
              {marker && (
                <Marker
                  coordinate={marker}
                  draggable
                  onDragEnd={(e) => {
                    const { latitude, longitude } = e.nativeEvent.coordinate;
                    setMarker({ latitude, longitude });
                    reverseGeocode(latitude, longitude);
                  }}
                />
              )}
            </MapView>
            <TouchableOpacity
              style={styles.myLocationBtn}
              onPress={getCurrentLocation}
              activeOpacity={0.8}
            >
              {locating ? (
                <ActivityIndicator size="small" color="#11796F" />
              ) : (
                <MaterialIcons name="my-location" size={22} color="#11796F" />
              )}
            </TouchableOpacity>
            {!marker && (
              <View style={styles.mapHint}>
                <Text style={styles.mapHintText}>
                  Tap the map to place a pin
                </Text>
              </View>
            )}
          </View>

          {/* Selected Address */}
          {address ? (
            <View style={styles.addressCard}>
              <MaterialIcons name="location-on" size={18} color="#11796F" />
              <Text style={styles.addressText} numberOfLines={2}>
                {address}
              </Text>
            </View>
          ) : null}

          {/* Form Fields */}
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Location Details</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Downtown Mall Parking"
                placeholderTextColor="#C7C7CC"
                value={title}
                onChangeText={setTitle}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe your parking space..."
                placeholderTextColor="#C7C7CC"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Price/Hour (₱) *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="25.00"
                  placeholderTextColor="#C7C7CC"
                  value={pricePerHour}
                  onChangeText={setPricePerHour}
                  keyboardType="numeric"
                />
              </View>
              {!isMultiLevel && (
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Total Slots</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="10"
                    placeholderTextColor="#C7C7CC"
                    value={totalSlots}
                    onChangeText={setTotalSlots}
                    keyboardType="numeric"
                  />
                </View>
              )}
            </View>
          </View>

          {/* Multi-Level Section */}
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Structure</Text>

            <View style={styles.switchRow}>
              <View style={styles.switchInfo}>
                <MaterialIcons name="layers" size={20} color="#11796F" />
                <View>
                  <Text style={styles.switchLabel}>Multi-Level Parking</Text>
                  <Text style={styles.switchHint}>
                    Enable if this is a multi-story structure
                  </Text>
                </View>
              </View>
              <Switch
                value={isMultiLevel}
                onValueChange={setIsMultiLevel}
                trackColor={{ false: "#E0E0E0", true: "#A5D6D0" }}
                thumbColor={isMultiLevel ? "#11796F" : "#fff"}
              />
            </View>

            {isMultiLevel && (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Number of Levels *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 3"
                    placeholderTextColor="#C7C7CC"
                    value={numberOfLevels}
                    onChangeText={handleLevelsChange}
                    keyboardType="numeric"
                  />
                </View>

                {levelSlots.length > 0 && (
                  <View style={styles.levelSlotsSection}>
                    <Text style={styles.label}>Slots Per Level *</Text>
                    {levelSlots.map((val, idx) => (
                      <View key={idx} style={styles.levelSlotRow}>
                        <View style={styles.levelBadge}>
                          <MaterialIcons name="layers" size={14} color="#fff" />
                          <Text style={styles.levelBadgeText}>
                            {levelToPrefix(idx + 1)}
                          </Text>
                        </View>
                        <Text style={styles.levelLabel}>Floor {idx + 1}</Text>
                        <TextInput
                          style={styles.levelSlotInput}
                          placeholder="Slots"
                          placeholderTextColor="#C7C7CC"
                          value={val}
                          onChangeText={(v) => handleLevelSlotChange(idx, v)}
                          keyboardType="numeric"
                        />
                      </View>
                    ))}
                  </View>
                )}

                {multiTotalSlots > 0 && (
                  <View style={styles.computedTotal}>
                    <MaterialIcons
                      name="info-outline"
                      size={16}
                      color="#11796F"
                    />
                    <Text style={styles.computedTotalText}>
                      Total: {multiTotalSlots} slots across {levelSlots.length}{" "}
                      levels
                    </Text>
                  </View>
                )}
              </>
            )}

            {/* Naming section — shown when there are slots */}
            {(isMultiLevel
              ? multiTotalSlots > 0
              : parseInt(totalSlots, 10) > 0) && (
              <>
                <View style={styles.switchRow}>
                  <View style={styles.switchInfo}>
                    <MaterialIcons name="edit" size={20} color="#11796F" />
                    <View>
                      <Text style={styles.switchLabel}>Custom Names</Text>
                      <Text style={styles.switchHint}>
                        Name each space yourself instead of auto (A1, B1...)
                      </Text>
                    </View>
                  </View>
                  <Switch
                    value={useCustomNames}
                    onValueChange={(val) => {
                      setUseCustomNames(val);
                      if (val) {
                        setCustomNames(getAutoNames());
                      }
                    }}
                    trackColor={{ false: "#E0E0E0", true: "#A5D6D0" }}
                    thumbColor={useCustomNames ? "#11796F" : "#fff"}
                  />
                </View>

                {useCustomNames && (
                  <View style={styles.namesList}>
                    {(() => {
                      const autoNames = getAutoNames();
                      let globalIdx = 0;
                      if (isMultiLevel) {
                        return levelSlots.map((slotsStr, lvlIdx) => {
                          const count = parseInt(slotsStr, 10) || 0;
                          const startIdx = globalIdx;
                          globalIdx += count;
                          return (
                            <View key={lvlIdx} style={{ gap: 6 }}>
                              <Text style={styles.namesFloorLabel}>
                                Floor {lvlIdx + 1}
                              </Text>
                              <View style={styles.namesGrid}>
                                {Array.from({ length: count }, (_, i) => {
                                  const idx = startIdx + i;
                                  return (
                                    <TextInput
                                      key={idx}
                                      style={styles.nameInput}
                                      placeholder={autoNames[idx]}
                                      placeholderTextColor="#C7C7CC"
                                      value={customNames[idx] || ""}
                                      onChangeText={(v) => {
                                        setCustomNames((prev) => {
                                          const next = [...prev];
                                          while (next.length <= idx)
                                            next.push("");
                                          next[idx] = v;
                                          return next;
                                        });
                                      }}
                                    />
                                  );
                                })}
                              </View>
                            </View>
                          );
                        });
                      }
                      const count = parseInt(totalSlots, 10) || 0;
                      return (
                        <View style={styles.namesGrid}>
                          {Array.from({ length: count }, (_, i) => (
                            <TextInput
                              key={i}
                              style={styles.nameInput}
                              placeholder={autoNames[i]}
                              placeholderTextColor="#C7C7CC"
                              value={customNames[i] || ""}
                              onChangeText={(v) => {
                                setCustomNames((prev) => {
                                  const next = [...prev];
                                  while (next.length <= i) next.push("");
                                  next[i] = v;
                                  return next;
                                });
                              }}
                            />
                          ))}
                        </View>
                      );
                    })()}
                  </View>
                )}

                {!useCustomNames && (
                  <View style={styles.namePreview}>
                    <Text style={styles.namePreviewLabel}>
                      Auto-generated names:
                    </Text>
                    <Text style={styles.namePreviewText} numberOfLines={3}>
                      {getAutoNames().join(", ")}
                    </Text>
                  </View>
                )}
              </>
            )}
          </View>

          {/* Images Section */}
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Photos *</Text>
            <Text style={styles.photoHint}>
              Upload clear photos for verification. Required images:
            </Text>
            <View style={styles.requiredImagesList}>
              <View style={styles.requiredImageItem}>
                <MaterialIcons name="door-front" size={16} color="#11796F" />
                <Text style={styles.requiredImageText}>Entrance view</Text>
              </View>
              <View style={styles.requiredImageItem}>
                <MaterialIcons name="local-parking" size={16} color="#11796F" />
                <Text style={styles.requiredImageText}>
                  Actual parking spot
                </Text>
              </View>
              <View style={styles.requiredImageItem}>
                <MaterialIcons name="streetview" size={16} color="#11796F" />
                <Text style={styles.requiredImageText}>Street view</Text>
              </View>
            </View>

            <View style={styles.imagesRow}>
              {images.map((uri, index) => (
                <View key={uri} style={styles.imageWrapper}>
                  <Image
                    source={{ uri }}
                    style={styles.imagePreview}
                    contentFit="cover"
                  />
                  {index === 0 && (
                    <View style={styles.primaryBadge}>
                      <Text style={styles.primaryBadgeText}>Primary</Text>
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.removeImageBtn}
                    onPress={() => removeImage(index)}
                  >
                    <MaterialIcons name="close" size={14} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
              {images.length < 5 && (
                <View style={styles.addImageButtons}>
                  <TouchableOpacity
                    style={styles.addImageBtn}
                    onPress={pickImages}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons
                      name="photo-library"
                      size={24}
                      color="#11796F"
                    />
                    <Text style={styles.addImageText}>Gallery</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.addImageBtn}
                    onPress={takePhoto}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons
                      name="camera-alt"
                      size={24}
                      color="#11796F"
                    />
                    <Text style={styles.addImageText}>Camera</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>

          {/* Proof of Residence Section */}
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Proof of Residence *</Text>
            <Text style={styles.photoHint}>
              Upload a document proving you own or have authority over this
              property.
            </Text>
            <View style={styles.proofExamplesList}>
              <Text style={styles.proofExamplesTitle}>Accepted documents:</Text>
              <Text style={styles.proofExampleItem}>
                • Utility bill (electricity, water, internet)
              </Text>
              <Text style={styles.proofExampleItem}>
                • Property tax receipt
              </Text>
              <Text style={styles.proofExampleItem}>• Land title or deed</Text>
              <Text style={styles.proofExampleItem}>
                • Lease agreement (if renting)
              </Text>
              <Text style={styles.proofExampleItem}>
                • Barangay clearance or certificate
              </Text>
            </View>

            {proofOfResidence ? (
              <View style={styles.proofImageContainer}>
                <View style={styles.imageWrapper}>
                  <Image
                    source={{ uri: proofOfResidence }}
                    style={styles.imagePreview}
                    contentFit="cover"
                  />
                  <TouchableOpacity
                    style={styles.removeImageBtn}
                    onPress={() => setProofOfResidence(null)}
                  >
                    <MaterialIcons name="close" size={14} color="#fff" />
                  </TouchableOpacity>
                </View>
                <View style={styles.proofUploadedBadge}>
                  <MaterialIcons
                    name="check-circle"
                    size={16}
                    color="#11796F"
                  />
                  <Text style={styles.proofUploadedText}>
                    Document uploaded
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.addImageButtons}>
                <TouchableOpacity
                  style={styles.addImageBtn}
                  onPress={pickProofOfResidence}
                  activeOpacity={0.7}
                >
                  <MaterialIcons
                    name="photo-library"
                    size={24}
                    color="#11796F"
                  />
                  <Text style={styles.addImageText}>Gallery</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.addImageBtn}
                  onPress={takeProofOfResidencePhoto}
                  activeOpacity={0.7}
                >
                  <MaterialIcons name="camera-alt" size={24} color="#11796F" />
                  <Text style={styles.addImageText}>Camera</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Submit Button */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[
              styles.submitButton,
              loading && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <MaterialIcons name="add-location-alt" size={22} color="#fff" />
                <Text style={styles.submitButtonText}>Add Parking Space</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8FAFB" },
  scrollContent: { padding: 16, paddingBottom: 8, gap: 14 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#1A1A2E",
    padding: 0,
  },
  mapContainer: {
    borderRadius: 16,
    overflow: "hidden",
    height: 220,
    backgroundColor: "#E8ECF0",
  },
  map: { flex: 1 },
  myLocationBtn: {
    position: "absolute",
    bottom: 12,
    right: 12,
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mapHint: {
    position: "absolute",
    top: 12,
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.65)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  mapHintText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  addressCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#E8F5F3",
    borderRadius: 12,
    padding: 12,
  },
  addressText: {
    flex: 1,
    fontSize: 13,
    color: "#1A1A2E",
    fontWeight: "500",
  },
  formSection: { gap: 14 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#8E8E93",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginLeft: 4,
  },
  inputGroup: { gap: 6 },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1A1A2E",
    marginLeft: 4,
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#1A1A2E",
    borderWidth: 1,
    borderColor: "#E8ECF0",
  },
  textArea: {
    minHeight: 72,
    textAlignVertical: "top",
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },

  // Multi-level
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E8ECF0",
  },
  switchInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  switchLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1A1A2E",
  },
  switchHint: {
    fontSize: 12,
    color: "#8E8E93",
    marginTop: 2,
  },
  computedTotal: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#E8F5F3",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  computedTotalText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#11796F",
  },

  // Level slots
  levelSlotsSection: { gap: 8 },
  levelSlotRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#E8ECF0",
  },
  levelBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#11796F",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  levelBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fff",
  },
  levelLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1A2E",
  },
  levelSlotInput: {
    width: 70,
    backgroundColor: "#F8FAFB",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 15,
    color: "#1A1A2E",
    textAlign: "center",
    borderWidth: 1,
    borderColor: "#E8ECF0",
  },

  // Naming
  namesList: { gap: 10 },
  namesFloorLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#11796F",
    marginLeft: 4,
  },
  namesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  nameInput: {
    width: 64,
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 8,
    fontSize: 14,
    color: "#1A1A2E",
    textAlign: "center",
    borderWidth: 1,
    borderColor: "#E8ECF0",
  },
  namePreview: {
    backgroundColor: "#F8FAFB",
    borderRadius: 10,
    padding: 12,
    gap: 4,
  },
  namePreviewLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#8E8E93",
  },
  namePreviewText: {
    fontSize: 13,
    color: "#1A1A2E",
    fontWeight: "500",
  },

  // Images
  photoHint: {
    fontSize: 13,
    color: "#8E8E93",
    marginLeft: 4,
    marginTop: -6,
  },
  imagesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  imageWrapper: {
    width: 96,
    height: 96,
    borderRadius: 14,
    overflow: "hidden",
  },
  imagePreview: {
    width: "100%",
    height: "100%",
  },
  primaryBadge: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(17,121,111,0.85)",
    paddingVertical: 3,
    alignItems: "center",
  },
  primaryBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
  removeImageBtn: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  addImageButtons: {
    flexDirection: "row",
    gap: 10,
  },
  addImageBtn: {
    width: 96,
    height: 96,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#11796F",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: "#F0FAF8",
  },
  addImageText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#11796F",
  },

  // Required images list
  requiredImagesList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 4,
  },
  requiredImageItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#E8F5F3",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  requiredImageText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#11796F",
  },

  // Proof of residence
  proofExamplesList: {
    backgroundColor: "#FFF9E6",
    borderRadius: 12,
    padding: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: "#F5E6B8",
  },
  proofExamplesTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#8B7A2B",
    marginBottom: 4,
  },
  proofExampleItem: {
    fontSize: 13,
    color: "#6B5E1F",
    lineHeight: 20,
  },
  proofImageContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  proofUploadedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#E8F5F3",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  proofUploadedText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#11796F",
  },

  bottomBar: {
    padding: 16,
    paddingTop: 10,
    backgroundColor: "#F8FAFB",
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  submitButton: {
    backgroundColor: "#11796F",
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#11796F",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    backgroundColor: "#B0BEC5",
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },
});
