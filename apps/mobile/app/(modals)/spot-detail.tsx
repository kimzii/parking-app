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
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useFocusEffect, router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import * as Location from "expo-location";
import { hostService } from "../../src/services/hosts";
import { driversService } from "../../src/services/drivers";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const IMAGE_HEIGHT = 220;
const MAP_HEIGHT = 140;

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
  openTime: string | null;
  closeTime: string | null;
  is24Hours: boolean;
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

function formatTime(time: string): string {
  const [hourStr, minuteStr] = time.split(":");
  let hour = parseInt(hourStr, 10);
  const minute = minuteStr || "00";
  const period = hour >= 12 ? "PM" : "AM";
  if (hour === 0) hour = 12;
  else if (hour > 12) hour -= 12;
  return `${hour}:${minute.padStart(2, "0")} ${period}`;
}

export default function SpotDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [spot, setSpot] = useState<SpotDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [checkingVehicles, setCheckingVehicles] = useState(false);

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
        await Location.getCurrentPositionAsync({});
      } catch {
        console.error("Failed to get user location");
      }
    })();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchSpot();
  };

  const openGoogleMaps = () => {
    if (!spot) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${spot.latitude},${spot.longitude}`;
    Linking.openURL(url);
  };

  const handleBookNow = useCallback(async () => {
    if (!spot) return;

    setCheckingVehicles(true);
    try {
      const vehicles = await driversService.getVehicles();

      if (!Array.isArray(vehicles) || vehicles.length === 0) {
        Alert.alert(
          "Vehicle Required",
          "Please add a vehicle first before booking a parking spot.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Add Vehicle",
              onPress: () => router.push("/(modals)/my-vehicles"),
            },
          ],
        );
        return;
      }

      router.push({
        pathname: "/(modals)/book-spot",
        params: { id: spot.id },
      });
    } catch (err: any) {
      const message = err?.response?.data?.message;

      if (
        typeof message === "string" &&
        message.toLowerCase().includes("driver profile not found")
      ) {
        Alert.alert(
          "Driver Profile Required",
          "Please complete your driver profile and add a vehicle before booking.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Become a Driver",
              onPress: () => router.push("/(modals)/become-a-driver"),
            },
          ],
        );
        return;
      }

      Alert.alert(
        "Unable to Check Vehicles",
        "Please try again before booking.",
      );
    } finally {
      setCheckingVehicles(false);
    }
  }, [spot]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["left", "right", "bottom"]}>
        <ActivityIndicator
          size="large"
          color="#D4501E"
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
            tintColor="#D4501E"
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
              <MaterialIcons name="location-on" size={16} color="#D4501E" />
              <Text style={styles.address} numberOfLines={2}>
                {spot.address}
              </Text>
              <MaterialIcons name="directions" size={18} color="#D4501E" />
            </TouchableOpacity>
          </View>

          {/* Quick Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <MaterialIcons name="payments" size={22} color="#D4501E" />
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
          </View>

          {/* Parking Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Parking Info</Text>
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <MaterialIcons name="local-parking" size={20} color="#D4501E" />
                <Text style={styles.infoLabel}>Type</Text>
                <Text style={styles.infoValue}>
                  {spot.isMultiLevel
                    ? "Multi-Level Parking"
                    : "Single-Level Parking"}
                </Text>
              </View>
              {spot.isMultiLevel && (
                <View style={styles.infoRow}>
                  <MaterialIcons name="layers" size={20} color="#D4501E" />
                  <Text style={styles.infoLabel}>Floors</Text>
                  <Text style={[styles.infoValue, { color: "#000" }]}>
                    {spot.numberOfLevels ?? "-"}{" "}
                    {spot.numberOfLevels === 1 ? "Floor" : "Floors"}
                  </Text>
                </View>
              )}
              <View style={styles.infoRow}>
                <MaterialIcons name="schedule" size={20} color="#D4501E" />
                <Text style={styles.infoLabel}>Hours</Text>
                <Text style={styles.infoValue}>
                  {spot.is24Hours
                    ? "Open 24 Hours"
                    : spot.openTime && spot.closeTime
                        ? `${formatTime(spot.openTime)} - ${formatTime(spot.closeTime)}`
                        : "Not specified"}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <MaterialIcons name="event-seat" size={20} color="#D4501E" />
                <Text style={styles.infoLabel}>Total Slots</Text>
                <Text style={styles.infoValue}>{total}</Text>
              </View>
            </View>
          </View>

          {/* Description + Parking Slots Card */}
          {(spot.description || spot.parkingSpaces.length > 0) && (
            <View style={styles.section}>
              <View style={styles.infoCard}>
                {spot.description && (
                  <View style={{ gap: 8 }}>
                    <Text style={styles.sectionTitle}>Description</Text>
                    <Text style={styles.descriptionText}>{spot.description}</Text>
                  </View>
                )}

                {spot.description && spot.parkingSpaces.length > 0 && (
                  <View
                    style={{
                      height: 1,
                      backgroundColor: "#E0E0E0",
                      marginVertical: 12,
                    }}
                  />
                )}

                {spot.parkingSpaces.length > 0 && (
                  <View style={{ gap: 10 }}>
                    <View style={styles.slotsHeader}>
                      <Text style={styles.sectionTitle}>Parking Slots</Text>
                      <View style={styles.legendRow}>
                        <View style={styles.legendItem}>
                          <View
                            style={[
                              styles.legendDot,
                              { backgroundColor: "#4CAF50" },
                            ]}
                          />
                          <Text style={styles.legendText}>{available} Free</Text>
                        </View>
                        <View style={styles.legendItem}>
                          <View
                            style={[
                              styles.legendDot,
                              { backgroundColor: "#D4501E" },
                            ]}
                          />
                          <Text style={styles.legendText}>
                            {occupied} Occupied
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                )}
              </View>
            </View>
          )}

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
        </View>
      </ScrollView>

      {/* Book Now Button */}
      {available > 0 && (
        <View style={styles.footer}>
          <View style={styles.footerPrice}>
            <Text style={styles.footerPriceLabel}>Parking Fee</Text>
            <Text style={styles.footerPriceValue}>
              ₱{Number(spot.basePricePerHour).toFixed(2)}/hr
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.bookBtn, checkingVehicles && styles.bookBtnDisabled]}
            onPress={handleBookNow}
            disabled={checkingVehicles}
            activeOpacity={0.8}
          >
            {checkingVehicles ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <MaterialIcons name="event-available" size={20} color="#fff" />
                <Text style={styles.bookBtnText}>Book Now</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#FFFFFF" },
  errorState: { alignItems: "center", paddingTop: 80, gap: 12 },
  errorTitle: { fontSize: 16, fontWeight: "700", color: "#232230" },

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
  noImageText: { fontSize: 14, color: "#A09A94" },

  // Content
  content: {
    padding: 20,
    gap: 20,
    paddingBottom: 110,
  },

  // Title Section
  titleSection: { gap: 8 },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#232230",
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
    color: "#A09A94",
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
    color: "#232230",
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#A09A94",
  },

  // Section
  section: { gap: 12 },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#232230",
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
    color: "#A09A94",
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
    color: "#232230",
  },
  dirInfoLabel: {
    fontSize: 11,
    color: "#A09A94",
    fontWeight: "600",
  },
  dirInfoDivider: {
    width: 1,
    height: 32,
    backgroundColor: "#E0E0E0",
  },
  dirNaText: {
    fontSize: 13,
    color: "#A09A94",
  },
  openMapsBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#D4501E",
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
    backgroundColor: "#D4501E",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  hostAvatarImg: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  hostLabel: { fontSize: 11, color: "#A09A94", fontWeight: "600" },
  hostName: { fontSize: 15, fontWeight: "700", color: "#232230" },

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
    color: "#A09A94",
    fontWeight: "600",
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#232230",
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
  legendText: { fontSize: 11, color: "#A09A94", fontWeight: "600" },

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
  footerPriceLabel: { fontSize: 12, color: "#A09A94", fontWeight: "600" },
  footerPriceValue: { fontSize: 20, fontWeight: "800", color: "#232230" },
  bookBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#D4501E",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  bookBtnDisabled: {
    opacity: 0.75,
  },
  bookBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
