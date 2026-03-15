import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useFocusEffect, router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import * as Location from "expo-location";
import { hostService } from "../../src/services/hosts";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const IMAGE_HEIGHT = 220;
const MAP_HEIGHT = 140;
const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

interface SpotImage {
  id: string;
  imageUrl: string;
  isPrimary: boolean;
}

interface ParkingSpace {
  id: string;
  slotNumber: number;
  name: string | null;
  levelNumber: number | null;
  status: "AVAILABLE" | "OCCUPIED" | "DISABLED";
}

interface SpotDetail {
  id: string;
  title: string;
  description: string | null;
  address: string;
  latitude: string;
  longitude: string;
  basePricePerHour: string;
  status: string;
  totalSlots: number | null;
  availableSlots: number | null;
  isMultiLevel: boolean;
  numberOfLevels: number | null;
  createdAt: string;
  images: SpotImage[];
  parkingSpaces: ParkingSpace[];
  host: {
    user: {
      firstName: string | null;
      lastName: string | null;
      profilePicture: string | null;
    };
  };
}

interface DirectionsInfo {
  distance: string;
  duration: string;
  routeCoords: { latitude: number; longitude: number }[];
}

const SLOT_COLORS = {
  AVAILABLE: { bg: "#E8F5E9", color: "#4CAF50" },
  OCCUPIED: { bg: "#FFF3E0", color: "#F57C00" },
  DISABLED: { bg: "#F5F5F5", color: "#9E9E9E" },
};

function decodePolyline(
  encoded: string,
): { latitude: number; longitude: number }[] {
  const points: { latitude: number; longitude: number }[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return points;
}

export default function SpotDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [spot, setSpot] = useState<SpotDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [directions, setDirections] = useState<DirectionsInfo | null>(null);
  const [directionsLoading, setDirectionsLoading] = useState(false);

  const fetchSpot = useCallback(async () => {
    if (!id) return;
    try {
      const data = await hostService.getPublicLocation(id);
      setSpot(data);
    } catch (err) {
      console.error("Failed to fetch spot:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      fetchSpot();
    }, [fetchSpot]),
  );

  // Get user location on mount
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return;
        const loc = await Location.getCurrentPositionAsync({});
        setUserLocation({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
      } catch {
        console.error("Failed to get user location");
      }
    })();
  }, []);

  // Fetch directions when both user location and spot are available
  useEffect(() => {
    if (!userLocation || !spot || !GOOGLE_MAPS_API_KEY) return;

    const fetchDirections = async () => {
      setDirectionsLoading(true);
      try {
        const origin = `${userLocation.latitude},${userLocation.longitude}`;
        const destination = `${spot.latitude},${spot.longitude}`;
        const res = await fetch(
          `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&mode=driving&key=${GOOGLE_MAPS_API_KEY}`,
        );
        const data = await res.json();

        if (data.routes?.length > 0) {
          const route = data.routes[0];
          const leg = route.legs[0];
          const routeCoords = decodePolyline(route.overview_polyline.points);
          setDirections({
            distance: leg.distance.text,
            duration: leg.duration.text,
            routeCoords,
          });
        }
      } catch (err) {
        console.error("Failed to fetch directions:", err);
      } finally {
        setDirectionsLoading(false);
      }
    };

    fetchDirections();
  }, [userLocation, spot]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchSpot();
  };

  const openGoogleMaps = () => {
    if (!spot) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${spot.latitude},${spot.longitude}`;
    Linking.openURL(url);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["left", "right", "bottom"]}>
        <ActivityIndicator
          size="large"
          color="#11796F"
          style={{ marginTop: 60 }}
        />
      </SafeAreaView>
    );
  }

  if (!spot) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["left", "right", "bottom"]}>
        <View style={styles.errorState}>
          <MaterialIcons name="error-outline" size={48} color="#E53935" />
          <Text style={styles.errorTitle}>Parking spot not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const spotLat = Number(spot.latitude);
  const spotLng = Number(spot.longitude);
  const available = spot.parkingSpaces.filter(
    (s) => s.status === "AVAILABLE",
  ).length;
  const occupied = spot.parkingSpaces.filter(
    (s) => s.status === "OCCUPIED",
  ).length;
  const total = spot.totalSlots ?? spot.parkingSpaces.length;
  const hostName = [spot.host?.user?.firstName, spot.host?.user?.lastName]
    .filter(Boolean)
    .join(" ");

  return (
    <SafeAreaView style={styles.safeArea} edges={["left", "right", "bottom"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#11796F"
          />
        }
      >
        {/* Image Carousel */}
        {spot.images.length > 0 ? (
          <View>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => {
                const idx = Math.round(
                  e.nativeEvent.contentOffset.x / SCREEN_WIDTH,
                );
                setActiveImage(idx);
              }}
            >
              {spot.images.map((img) => (
                <Image
                  key={img.id}
                  source={{ uri: img.imageUrl }}
                  style={styles.carouselImage}
                  contentFit="cover"
                />
              ))}
            </ScrollView>
            {spot.images.length > 1 && (
              <View style={styles.dotsRow}>
                {spot.images.map((_, i) => (
                  <View
                    key={i}
                    style={[styles.dot, i === activeImage && styles.dotActive]}
                  />
                ))}
              </View>
            )}
          </View>
        ) : (
          <View style={styles.noImagePlaceholder}>
            <MaterialIcons name="image" size={48} color="#C7C7CC" />
            <Text style={styles.noImageText}>No photos available</Text>
          </View>
        )}

        <View style={styles.content}>
          {/* Title & Address */}
          <View style={styles.titleSection}>
            <Text style={styles.title}>{spot.title}</Text>
            <TouchableOpacity
              style={styles.addressRow}
              onPress={openGoogleMaps}
              activeOpacity={0.7}
            >
              <MaterialIcons name="location-on" size={16} color="#11796F" />
              <Text style={styles.address} numberOfLines={2}>
                {spot.address}
              </Text>
              <MaterialIcons name="directions" size={18} color="#11796F" />
            </TouchableOpacity>
          </View>

          {/* Quick Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <MaterialIcons name="payments" size={22} color="#11796F" />
              <Text style={styles.statValue}>
                P{Number(spot.basePricePerHour).toFixed(2)}
              </Text>
              <Text style={styles.statLabel}>per hour</Text>
            </View>
            <View style={styles.statCard}>
              <MaterialIcons
                name="event-seat"
                size={22}
                color={available > 0 ? "#4CAF50" : "#E53935"}
              />
              <Text
                style={[
                  styles.statValue,
                  { color: available > 0 ? "#4CAF50" : "#E53935" },
                ]}
              >
                {available}/{total}
              </Text>
              <Text style={styles.statLabel}>available</Text>
            </View>
            {spot.isMultiLevel && (
              <View style={styles.statCard}>
                <MaterialIcons name="layers" size={22} color="#1976D2" />
                <Text style={[styles.statValue, { color: "#1976D2" }]}>
                  {spot.numberOfLevels ?? "-"}
                </Text>
                <Text style={styles.statLabel}>levels</Text>
              </View>
            )}
          </View>

          {/* Parking Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Parking Info</Text>
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <MaterialIcons name="local-parking" size={20} color="#11796F" />
                <Text style={styles.infoLabel}>Type</Text>
                <Text style={styles.infoValue}>
                  {spot.isMultiLevel
                    ? "Multi-Level Parking"
                    : "Single-Level Parking"}
                </Text>
              </View>
              {spot.isMultiLevel && (
                <View style={styles.infoRow}>
                  <MaterialIcons name="layers" size={20} color="#1976D2" />
                  <Text style={styles.infoLabel}>Floors</Text>
                  <Text style={[styles.infoValue, { color: "#1976D2" }]}>
                    {spot.numberOfLevels ?? "-"}{" "}
                    {spot.numberOfLevels === 1 ? "Floor" : "Floors"}
                  </Text>
                </View>
              )}
              <View style={styles.infoRow}>
                <MaterialIcons name="event-seat" size={20} color="#11796F" />
                <Text style={styles.infoLabel}>Total Slots</Text>
                <Text style={styles.infoValue}>{total}</Text>
              </View>
              <View style={styles.infoRow}>
                <MaterialIcons
                  name="check-circle"
                  size={20}
                  color={available > 0 ? "#4CAF50" : "#E53935"}
                />
                <Text style={styles.infoLabel}>Available</Text>
                <Text
                  style={[
                    styles.infoValue,
                    { color: available > 0 ? "#4CAF50" : "#E53935" },
                  ]}
                >
                  {available > 0 ? `${available} Slots` : "Full"}
                </Text>
              </View>
            </View>
          </View>

          {/* Description */}
          {spot.description ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About</Text>
              <Text style={styles.descriptionText}>{spot.description}</Text>
            </View>
          ) : null}

          {/* Host Info */}
          {hostName ? (
            <View style={styles.hostCard}>
              <View style={styles.hostAvatar}>
                {spot.host?.user?.profilePicture ? (
                  <Image
                    source={{ uri: spot.host.user.profilePicture }}
                    style={styles.hostAvatarImg}
                  />
                ) : (
                  <MaterialIcons name="person" size={22} color="#fff" />
                )}
              </View>
              <View>
                <Text style={styles.hostLabel}>Hosted by</Text>
                <Text style={styles.hostName}>{hostName}</Text>
              </View>
            </View>
          ) : null}

          {/* Parking Slots */}
          {spot.parkingSpaces.length > 0 && (
            <View style={styles.section}>
              <View style={styles.slotsHeader}>
                <Text style={styles.sectionTitle}>Parking Slots</Text>
                <View style={styles.legendRow}>
                  <View style={styles.legendItem}>
                    <View
                      style={[styles.legendDot, { backgroundColor: "#4CAF50" }]}
                    />
                    <Text style={styles.legendText}>{available} Free</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View
                      style={[styles.legendDot, { backgroundColor: "#F57C00" }]}
                    />
                    <Text style={styles.legendText}>{occupied} Busy</Text>
                  </View>
                </View>
              </View>
              {(() => {
                const hasLevels = spot.parkingSpaces.some(
                  (s) => s.levelNumber != null,
                );
                if (hasLevels) {
                  const levelMap = new Map<number, ParkingSpace[]>();
                  spot.parkingSpaces.forEach((s) => {
                    const lvl = s.levelNumber ?? 0;
                    if (!levelMap.has(lvl)) levelMap.set(lvl, []);
                    levelMap.get(lvl)!.push(s);
                  });
                  const sortedLevels = [...levelMap.keys()].sort(
                    (a, b) => a - b,
                  );
                  return (
                    <View style={{ gap: 14 }}>
                      {sortedLevels.map((level) => {
                        const levelSpaces = levelMap.get(level)!;
                        const levelAvail = levelSpaces.filter(
                          (s) => s.status === "AVAILABLE",
                        ).length;
                        return (
                          <View key={level} style={{ gap: 8 }}>
                            <View style={styles.floorHeader}>
                              <MaterialIcons
                                name="layers"
                                size={16}
                                color="#11796F"
                              />
                              <Text style={styles.floorTitle}>
                                Floor {level}
                              </Text>
                              <Text style={styles.floorCount}>
                                {levelAvail}/{levelSpaces.length} available
                              </Text>
                            </View>
                            <View style={styles.slotsGrid}>
                              {levelSpaces.map((space) => {
                                const colors = SLOT_COLORS[space.status];
                                return (
                                  <View
                                    key={space.id}
                                    style={[
                                      styles.slotCell,
                                      {
                                        backgroundColor: colors.bg,
                                        borderColor: colors.color,
                                      },
                                    ]}
                                  >
                                    <MaterialIcons
                                      name={
                                        space.status === "AVAILABLE"
                                          ? "event-seat"
                                          : space.status === "OCCUPIED"
                                            ? "directions-car"
                                            : "block"
                                      }
                                      size={18}
                                      color={colors.color}
                                    />
                                    <Text
                                      style={[
                                        styles.slotNumber,
                                        { color: colors.color },
                                      ]}
                                    >
                                      {space.name || space.slotNumber}
                                    </Text>
                                  </View>
                                );
                              })}
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  );
                }
                return (
                  <View style={styles.slotsGrid}>
                    {spot.parkingSpaces.map((space) => {
                      const colors = SLOT_COLORS[space.status];
                      return (
                        <View
                          key={space.id}
                          style={[
                            styles.slotCell,
                            {
                              backgroundColor: colors.bg,
                              borderColor: colors.color,
                            },
                          ]}
                        >
                          <MaterialIcons
                            name={
                              space.status === "AVAILABLE"
                                ? "event-seat"
                                : space.status === "OCCUPIED"
                                  ? "directions-car"
                                  : "block"
                            }
                            size={18}
                            color={colors.color}
                          />
                          <Text
                            style={[styles.slotNumber, { color: colors.color }]}
                          >
                            {space.name || space.slotNumber}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                );
              })()}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Book Now Button */}
      {available > 0 && (
        <View style={styles.footer}>
          <View style={styles.footerPrice}>
            <Text style={styles.footerPriceLabel}>From</Text>
            <Text style={styles.footerPriceValue}>
              ₱{Number(spot.basePricePerHour).toFixed(2)}/hr
            </Text>
          </View>
          <TouchableOpacity
            style={styles.bookBtn}
            onPress={() =>
              router.push({
                pathname: "/(modals)/book-spot",
                params: { id: spot.id },
              })
            }
            activeOpacity={0.8}
          >
            <MaterialIcons name="event-available" size={20} color="#fff" />
            <Text style={styles.bookBtnText}>Book Now</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8FAFB" },
  errorState: { alignItems: "center", paddingTop: 80, gap: 12 },
  errorTitle: { fontSize: 16, fontWeight: "700", color: "#1A1A2E" },

  // Image Carousel
  carouselImage: {
    width: SCREEN_WIDTH,
    height: IMAGE_HEIGHT,
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.5)",
  },
  dotActive: {
    backgroundColor: "#fff",
    width: 20,
  },
  noImagePlaceholder: {
    height: IMAGE_HEIGHT,
    backgroundColor: "#E8ECF0",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  noImageText: { fontSize: 14, color: "#8E8E93" },

  // Content
  content: {
    padding: 20,
    gap: 20,
    paddingBottom: 100,
  },

  // Title Section
  titleSection: { gap: 8 },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1A1A2E",
    letterSpacing: -0.3,
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  address: {
    flex: 1,
    fontSize: 14,
    color: "#8E8E93",
  },

  // Stats Row
  statsRow: {
    flexDirection: "row",
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    gap: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1A1A2E",
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#8E8E93",
  },

  // Section
  section: { gap: 12 },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1A1A2E",
  },
  descriptionText: {
    fontSize: 14,
    color: "#555",
    lineHeight: 22,
  },

  // Directions Card
  directionsCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  miniMapContainer: {
    height: MAP_HEIGHT,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    overflow: "hidden",
  },
  miniMap: {
    flex: 1,
  },
  directionsInfo: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  directionsLoadingText: {
    fontSize: 13,
    color: "#8E8E93",
  },
  dirInfoItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dirInfoValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1A1A2E",
  },
  dirInfoLabel: {
    fontSize: 11,
    color: "#8E8E93",
    fontWeight: "600",
  },
  dirInfoDivider: {
    width: 1,
    height: 32,
    backgroundColor: "#E0E0E0",
  },
  dirNaText: {
    fontSize: 13,
    color: "#8E8E93",
  },
  openMapsBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#11796F",
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    paddingVertical: 14,
  },
  openMapsBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },

  // Host Card
  hostCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  hostAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#11796F",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  hostAvatarImg: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  hostLabel: { fontSize: 11, color: "#8E8E93", fontWeight: "600" },
  hostName: { fontSize: 15, fontWeight: "700", color: "#1A1A2E" },

  // Parking Info
  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    gap: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  infoLabel: {
    flex: 1,
    fontSize: 14,
    color: "#8E8E93",
    fontWeight: "600",
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1A1A2E",
  },

  // Slots
  slotsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  legendRow: { flexDirection: "row", gap: 12 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: "#8E8E93", fontWeight: "600" },
  floorHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  floorTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#11796F",
  },
  floorCount: {
    fontSize: 12,
    color: "#8E8E93",
    fontWeight: "600",
    marginLeft: "auto",
  },
  slotsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  slotCell: {
    width: 60,
    height: 60,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  slotNumber: {
    fontSize: 12,
    fontWeight: "800",
  },

  // Footer/Book Button
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    padding: 16,
    paddingBottom: 48,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
  },
  footerPrice: { gap: 2 },
  footerPriceLabel: { fontSize: 12, color: "#8E8E93", fontWeight: "600" },
  footerPriceValue: { fontSize: 20, fontWeight: "800", color: "#1A1A2E" },
  bookBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#11796F",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  bookBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
