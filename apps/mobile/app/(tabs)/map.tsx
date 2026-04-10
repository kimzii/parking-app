import React, { useState, useCallback, useRef, useEffect, memo } from "react";
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
import { userService } from "../../src/services/user";

interface ParkingSpot {
  id: string;
  title: string;
  address: string;
  latitude: number;
  longitude: number;
  basePricePerHour: string;
  totalSlots: number | null;
  availableSlots: number | null;
  acceptedVehicles?: string[];
  images: { imageUrl: string }[];
}

const ParkingMarker = memo(function ParkingMarker({
  spot,
  isSelected,
  onPress,
}: {
  spot: ParkingSpot;
  isSelected: boolean;
  onPress: () => void;
}) {
  const [tracksViewChanges, setTracksViewChanges] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setTracksViewChanges(false), 500);
    return () => clearTimeout(t);
  }, []);

  const av = spot.acceptedVehicles ?? ["CAR", "MOTORCYCLE"];
  const carOnly = av.length === 1 && av.includes("CAR");
  const motoOnly = av.length === 1 && av.includes("MOTORCYCLE");
  const markerColor = motoOnly ? "#FF9800" : carOnly ? "#1976D2" : "#D4501E";

  return (
    <Marker
      coordinate={{
        latitude: Number(spot.latitude),
        longitude: Number(spot.longitude),
      }}
      title={spot.title}
      description={`₱${Number(spot.basePricePerHour).toFixed(2)}/hr`}
      onPress={onPress}
      tracksViewChanges={tracksViewChanges || isSelected}
    >
      <View style={styles.markerContainer}>
        <View style={[styles.markerBubble, { backgroundColor: markerColor }]}>
          <MaterialIcons
            name={motoOnly ? "two-wheeler" : carOnly ? "directions-car" : "local-parking"}
            size={10}
            color="#fff"
          />
          <Text style={styles.markerPrice}>
            ₱{Number(spot.basePricePerHour).toFixed(0)}
          </Text>
        </View>
        <View style={[styles.markerArrow, { borderTopColor: markerColor }]} />
      </View>
    </Marker>
  );
});

const DEFAULT_REGION: Region = {
  latitude: 14.5995,
  longitude: 120.9842,
  latitudeDelta: 0.03,
  longitudeDelta: 0.03,
};

const RADIUS_KM = 20;
const MAP_FETCH_LIMIT = 50;
const MAP_MOVE_DEBOUNCE_MS = 450;

type Coordinates = { latitude: number; longitude: number };

export default function MapScreen() {
  const mapRef = useRef<MapView>(null);
  const mapMoveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isProgrammaticMoveRef = useRef(false);
  const hasInitializedRef = useRef(false);
  const regionRef = useRef<Region>(DEFAULT_REGION);
  const userLocationRef = useRef<Coordinates | null>(null);
  const [region, setRegion] = useState<Region>(DEFAULT_REGION);
  const [spots, setSpots] = useState<ParkingSpot[]>([]);
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);
  const [selectedSpot, setSelectedSpot] = useState<ParkingSpot | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDriverVerified, setIsDriverVerified] = useState(true);
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);

  const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    userLocationRef.current = userLocation;
  }, [userLocation]);

  useEffect(() => {
    regionRef.current = region;
  }, [region]);

  const moveMapToRegion = useCallback((nextRegion: Region) => {
    isProgrammaticMoveRef.current = true;
    setRegion(nextRegion);
    mapRef.current?.animateToRegion(nextRegion, 500);
  }, []);

  const fetchNearbySpots = useCallback(
    async (options?: {
      center?: Coordinates | null;
      radiusKm?: number;
      limit?: number;
    }) => {
      const center = options?.center ?? userLocationRef.current;
      const radiusKm = options?.radiusKm ?? RADIUS_KM;
      const limit = options?.limit ?? MAP_FETCH_LIMIT;

      try {
        const [data, profile] = await Promise.all([
          hostService.getNearbyLocations(
            center
              ? {
                  latitude: center.latitude,
                  longitude: center.longitude,
                  radius: radiusKm,
                  limit,
                }
              : { limit },
          ),
          userService.getProfile(),
        ]);

        setSpots(data || []);

        const verified =
          profile.roleStatuses?.some(
            (rs: { role: string; status: string }) =>
              rs.role === "DRIVER" && rs.status === "VERIFIED",
          ) ?? false;
        setIsDriverVerified(verified);
      } catch (err) {
        console.error("Failed to fetch parking spots:", err);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const initLocationAndSpots = useCallback(async () => {
    setLocating(true);
    let loc: Coordinates | null = null;
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const location = await Location.getCurrentPositionAsync({});
        loc = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };
        const newRegion: Region = {
          ...loc,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        };
        setUserLocation(loc);
        moveMapToRegion(newRegion);
      }
    } catch {
      console.error("Failed to get location");
    } finally {
      setLocating(false);
    }

    await fetchNearbySpots({
      center: loc,
      radiusKm: RADIUS_KM,
      limit: MAP_FETCH_LIMIT,
    });
    hasInitializedRef.current = true;
  }, [fetchNearbySpots, moveMapToRegion]);

  useEffect(() => {
    void initLocationAndSpots();
  }, [initLocationAndSpots]);

  useEffect(() => {
    return () => {
      if (mapMoveDebounceRef.current) {
        clearTimeout(mapMoveDebounceRef.current);
      }
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      // Refresh using current camera center without forcing a recenter to GPS.
      if (!hasInitializedRef.current) {
        return;
      }

      const focusRegion = regionRef.current;
      void fetchNearbySpots({
        center: {
          latitude: focusRegion.latitude,
          longitude: focusRegion.longitude,
        },
        radiusKm: RADIUS_KM,
        limit: MAP_FETCH_LIMIT,
      });
    }, [fetchNearbySpots]),
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
      const loc = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      const newRegion: Region = {
        ...loc,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      };
      setUserLocation(loc);
      moveMapToRegion(newRegion);
      await fetchNearbySpots({
        center: loc,
        radiusKm: RADIUS_KM,
        limit: MAP_FETCH_LIMIT,
      });
    } catch {
      console.error("Failed to get location");
    } finally {
      setLocating(false);
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
        moveMapToRegion(newRegion);
        await fetchNearbySpots({
          center: { latitude: lat, longitude: lng },
          radiusKm: RADIUS_KM,
          limit: MAP_FETCH_LIMIT,
        });
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
          <MaterialIcons name="search" size={20} color="#A09A94" />
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
              <MaterialIcons name="arrow-forward" size={20} color="#F5470D" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Map */}
        <View style={styles.mapContainer}>
          {loading ? (
            <ActivityIndicator
              size="large"
              color="#F5470D"
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
              onRegionChangeComplete={(nextRegion) => {
                setRegion(nextRegion);

                if (!hasInitializedRef.current) {
                  return;
                }

                if (isProgrammaticMoveRef.current) {
                  isProgrammaticMoveRef.current = false;
                  return;
                }

                if (mapMoveDebounceRef.current) {
                  clearTimeout(mapMoveDebounceRef.current);
                }

                mapMoveDebounceRef.current = setTimeout(() => {
                  void fetchNearbySpots({
                    center: {
                      latitude: nextRegion.latitude,
                      longitude: nextRegion.longitude,
                    },
                    radiusKm: RADIUS_KM,
                    limit: MAP_FETCH_LIMIT,
                  });
                }, MAP_MOVE_DEBOUNCE_MS);
              }}
            >
              {spots.map((spot) => (
                <ParkingMarker
                  key={spot.id}
                  spot={spot}
                  isSelected={selectedSpot?.id === spot.id}
                  onPress={() => setSelectedSpot(spot)}
                />
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
              <ActivityIndicator size="small" color="#D4501E" />
            ) : (
              <MaterialIcons name="my-location" size={22} color="#D4501E" />
            )}
          </TouchableOpacity>

          {/* Spot count badge */}
          <View style={styles.spotCountBadge}>
            <MaterialIcons name="local-parking" size={14} color="#D4501E" />
            <Text style={styles.spotCountText}>
              {spots.length} spot{spots.length !== 1 ? "s" : ""} within{" "}
              {RADIUS_KM}{" "}km
            </Text>
          </View>
        </View>

        {/* Selected Spot Card */}
        {selectedSpot && (
          <View style={styles.spotCard}>
            <View style={styles.spotCardHeader}>
              <View style={styles.spotIconBg}>
                <MaterialIcons name="local-parking" size={22} color="#D4501E" />
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
                <MaterialIcons name="close" size={20} color="#A09A94" />
              </TouchableOpacity>
            </View>
            <View style={styles.spotCardDetails}>
              <View style={styles.spotDetailItem}>
                <MaterialIcons name="payments" size={16} color="#D4501E" />
                <Text style={styles.spotDetailText}>
                  ₱{Number(selectedSpot.basePricePerHour).toFixed(2)}/hr
                </Text>
              </View>
              <View style={styles.spotDetailItem}>
                <MaterialIcons name="event-seat" size={16} color="#D4501E" />
                <Text style={styles.spotDetailText}>
                  {selectedSpot.availableSlots ?? selectedSpot.totalSlots ?? 0}{" "}
                  slots
                </Text>
              </View>
              <View style={styles.spotDetailItem}>
                {(!selectedSpot.acceptedVehicles || selectedSpot.acceptedVehicles.includes("CAR")) && (
                  <MaterialIcons name="directions-car" size={16} color="#D4501E" />
                )}
                {(!selectedSpot.acceptedVehicles || selectedSpot.acceptedVehicles.includes("MOTORCYCLE")) && (
                  <MaterialIcons name="two-wheeler" size={16} color="#D4501E" />
                )}
              </View>
            </View>
            <TouchableOpacity
              style={[
                styles.viewDetailsBtn,
                !isDriverVerified && styles.viewDetailsBtnLocked,
              ]}
              activeOpacity={0.8}
              onPress={() => {
                if (!isDriverVerified) {
                  router.push("/(modals)/driver-verification");
                  return;
                }
                setSelectedSpot(null);
                router.push({
                  pathname: "/(modals)/spot-detail",
                  params: { id: selectedSpot.id },
                } as any);
              }}
            >
              {!isDriverVerified && (
                <MaterialIcons name="lock" size={16} color="#fff" />
              )}
              <Text style={styles.viewDetailsBtnText}>
                {isDriverVerified ? "View Details" : "Verify to View Details"}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Verification banner */}
        {!isDriverVerified && !selectedSpot && (
          <TouchableOpacity
            style={styles.verifyOverlay}
            onPress={() => router.push("/(modals)/driver-verification")}
            activeOpacity={0.8}
          >
            <MaterialIcons name="lock" size={18} color="#D4501E" />
            <Text style={styles.verifyOverlayText}>
              Verify your account to book parking spots
            </Text>
            <MaterialIcons name="chevron-right" size={20} color="#D4501E" />
          </TouchableOpacity>
        )}

        {/* Empty state */}
        {!loading && spots.length === 0 && !selectedSpot && (
          <View style={styles.emptyOverlay}>
            <View style={styles.emptyCard}>
              <MaterialIcons name="location-off" size={32} color="#D4501E" />
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
  safeArea: { flex: 1, backgroundColor: "#FFFFFF" },
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
    color: "#232230",
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
    fontSize: 14,
    fontWeight: "700",
    color: "#232230",
  },
  markerContainer: { alignItems: "center" },
  markerBubble: {
    backgroundColor: "#D4501E",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  markerIconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
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
    borderTopColor: "#D4501E",
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
    backgroundColor: "#FFF0EC",
    justifyContent: "center",
    alignItems: "center",
  },
  spotTitle: { fontSize: 16, fontWeight: "700", color: "#232230" },
  spotAddress: { fontSize: 13, color: "#A09A94", marginTop: 2 },
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
  spotDetailText: { fontSize: 14, color: "#D4501E", fontWeight: "700" },
  viewDetailsBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#D4501E",
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
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#232230" },
  emptySubtitle: { fontSize: 13, color: "#A09A94", textAlign: "center" },
  viewDetailsBtnLocked: {
    backgroundColor: "#B0BEC5",
  },
  verifyOverlay: {
    position: "absolute",
    bottom: 24,
    left: 24,
    right: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFF0EC",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: "#D4501E",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  verifyOverlayText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    color: "#D4501E",
  },
});
