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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import MapView, { Marker, Region, PROVIDER_GOOGLE } from "react-native-maps";
import * as Location from "expo-location";
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
  const [marker, setMarker] = useState<{ latitude: number; longitude: number } | null>(null);
  const [address, setAddress] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [pricePerHour, setPricePerHour] = useState("");
  const [totalSlots, setTotalSlots] = useState("");
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);

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

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert("Missing Info", "Please enter a title.");
      return;
    }
    if (!marker) {
      Alert.alert("Missing Location", "Please tap the map to select a location.");
      return;
    }
    if (!pricePerHour || parseFloat(pricePerHour) <= 0) {
      Alert.alert("Missing Info", "Please enter a valid price per hour.");
      return;
    }

    setLoading(true);
    try {
      await hostService.createLocation({
        title: title.trim(),
        address: address || "No address",
        latitude: marker.latitude,
        longitude: marker.longitude,
        basePricePerHour: parseFloat(pricePerHour),
        description: description.trim() || undefined,
        totalSlots: totalSlots ? parseInt(totalSlots, 10) : undefined,
      });
      Alert.alert("Success", "Parking location created successfully!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Failed to create location.";
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
                <Text style={styles.mapHintText}>Tap the map to place a pin</Text>
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
            </View>
          </View>
        </ScrollView>

        {/* Submit Button */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
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
    height: 260,
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
