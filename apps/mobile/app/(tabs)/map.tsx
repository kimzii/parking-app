import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import MapView, { Marker, Region, PROVIDER_GOOGLE } from "react-native-maps";
import * as Location from "expo-location";
import { hostService } from "../../src/services/hosts";

interface ParkingSpot {
  id: string;
  title: string;
  address: string;
  latitude: number;
  longitude: number;
  basePricePerHour: string;
  totalSlots: number | null;
  availableSlots: number | null;
  images: { imageUrl: string }[];
}

const DEFAULT_REGION: Region = {
  latitude: 14.5995,
  longitude: 120.9842,
  latitudeDelta: 0.03,
  longitudeDelta: 0.03,
};

export default function MapScreen() {
  const mapRef = useRef<MapView>(null);
  const [region, setRegion] = useState<Region>(DEFAULT_REGION);
  const [spots, setSpots] = useState<ParkingSpot[]>([]);
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);
  const [selectedSpot, setSelectedSpot] = useState<ParkingSpot | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    getCurrentLocation();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchNearbySpots();
    }, []),
  );

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
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      };
      setRegion(newRegion);
      mapRef.current?.animateToRegion(newRegion, 500);
    } catch {
      console.error("Failed to get location");
    } finally {
      setLocating(false);
    }
  };

  const fetchNearbySpots = async () => {
    try {
      const data = await hostService.getNearbyLocations({ limit: 50 });
      setSpots(data || []);
    } catch (err) {
      console.error("Failed to fetch parking spots:", err);
    } finally {
      setLoading(false);
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
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        };
        setRegion(newRegion);
        mapRef.current?.animateToRegion(newRegion, 500);
      }
    } catch {
      console.error("Search failed");
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        {/* Search Bar */}
        <View style={styles.searchBar}>
          <MaterialIcons name="search" size={20} color="#8E8E93" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for parking..."
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
          {loading ? (
            <ActivityIndicator
              size="large"
              color="#11796F"
              style={{ flex: 1 }}
            />
          ) : (
            <MapView
              ref={mapRef}
              style={styles.map}
              provider={PROVIDER_GOOGLE}
              initialRegion={region}
              showsUserLocation
              showsMyLocationButton={false}
              onPress={() => setSelectedSpot(null)}
            >
              {spots.map((spot) => (
                <Marker
                  key={spot.id}
                  coordinate={{
                    latitude: Number(spot.latitude),
                    longitude: Number(spot.longitude),
                  }}
                  title={spot.title}
                  description={`₱${Number(spot.basePricePerHour).toFixed(2)}/hr`}
                  onPress={() => setSelectedSpot(spot)}
                >
                  <View style={styles.markerContainer}>
                    <View style={styles.markerBubble}>
                      <Text style={styles.markerPrice}>
                        ₱{Number(spot.basePricePerHour).toFixed(0)}
                      </Text>
                    </View>
                    <View style={styles.markerArrow} />
                  </View>
                </Marker>
              ))}
            </MapView>
          )}

          {/* My Location Button */}
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

          {/* Spot count badge */}
          <View style={styles.spotCountBadge}>
            <MaterialIcons name="local-parking" size={14} color="#11796F" />
            <Text style={styles.spotCountText}>
              {spots.length} spot{spots.length !== 1 ? "s" : ""} available
            </Text>
          </View>
        </View>

        {/* Selected Spot Card */}
        {selectedSpot && (
          <View style={styles.spotCard}>
            <View style={styles.spotCardHeader}>
              <View style={styles.spotIconBg}>
                <MaterialIcons
                  name="local-parking"
                  size={22}
                  color="#11796F"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.spotTitle} numberOfLines={1}>
                  {selectedSpot.title}
                </Text>
                <Text style={styles.spotAddress} numberOfLines={1}>
                  {selectedSpot.address}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedSpot(null)}>
                <MaterialIcons name="close" size={20} color="#8E8E93" />
              </TouchableOpacity>
            </View>
            <View style={styles.spotCardDetails}>
              <View style={styles.spotDetailItem}>
                <MaterialIcons name="payments" size={16} color="#11796F" />
                <Text style={styles.spotDetailText}>
                  ₱{Number(selectedSpot.basePricePerHour).toFixed(2)}/hr
                </Text>
              </View>
              <View style={styles.spotDetailItem}>
                <MaterialIcons name="event-seat" size={16} color="#11796F" />
                <Text style={styles.spotDetailText}>
                  {selectedSpot.availableSlots ?? selectedSpot.totalSlots ?? 0}{" "}
                  slots
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.viewDetailsBtn}
              activeOpacity={0.8}
              onPress={() => {
                setSelectedSpot(null);
                router.push({
                  pathname: "/(modals)/spot-detail",
                  params: { id: selectedSpot.id },
                } as any);
              }}
            >
              <Text style={styles.viewDetailsBtnText}>View Details</Text>
              <MaterialIcons name="arrow-forward" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        )}

        {/* Empty state */}
        {!loading && spots.length === 0 && !selectedSpot && (
          <View style={styles.emptyOverlay}>
            <View style={styles.emptyCard}>
              <MaterialIcons name="location-off" size={32} color="#11796F" />
              <Text style={styles.emptyTitle}>No parking spots yet</Text>
              <Text style={styles.emptySubtitle}>
                No approved parking locations available in this area
              </Text>
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8FAFB" },
  container: { flex: 1 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 10,
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
    flex: 1,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#E8ECF0",
  },
  map: { flex: 1 },
  myLocationBtn: {
    position: "absolute",
    bottom: 16,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  spotCountBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  spotCountText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1A1A2E",
  },
  markerContainer: { alignItems: "center" },
  markerBubble: {
    backgroundColor: "#11796F",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  markerPrice: { color: "#fff", fontSize: 12, fontWeight: "800" },
  markerArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 6,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#11796F",
  },
  spotCard: {
    position: "absolute",
    bottom: 24,
    left: 24,
    right: 24,
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 16,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  spotCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  spotIconBg: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#E8F5F3",
    justifyContent: "center",
    alignItems: "center",
  },
  spotTitle: { fontSize: 16, fontWeight: "700", color: "#1A1A2E" },
  spotAddress: { fontSize: 13, color: "#8E8E93", marginTop: 2 },
  spotCardDetails: {
    flexDirection: "row",
    gap: 20,
    paddingLeft: 56,
  },
  spotDetailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  spotDetailText: { fontSize: 14, color: "#11796F", fontWeight: "700" },
  viewDetailsBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#11796F",
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 4,
  },
  viewDetailsBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  emptyOverlay: {
    position: "absolute",
    bottom: 24,
    left: 24,
    right: 24,
  },
  emptyCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 24,
    alignItems: "center",
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#1A1A2E" },
  emptySubtitle: { fontSize: 13, color: "#8E8E93", textAlign: "center" },
});
