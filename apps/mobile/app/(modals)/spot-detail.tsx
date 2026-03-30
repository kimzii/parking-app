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
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useFocusEffect, router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import * as Location from "expo-location";
import { hostService } from "../../src/services/hosts";
import { driversService } from "../../src/services/drivers";
import {
  getLocationReviews,
  getLocationRating,
  Review,
  LocationRating,
} from "../../src/services/reviews";

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
  acceptedVehicles?: string[];
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
  const [rating, setRating] = useState<LocationRating | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [showReviews, setShowReviews] = useState(false);
  const [loadingReviews, setLoadingReviews] = useState(false);

  const fetchSpot = useCallback(async () => {
    if (!id) return;
    try {
      const [data, ratingData] = await Promise.all([
        hostService.getPublicLocation(id),
        getLocationRating(id),
      ]);
      setSpot(data);
      setRating(ratingData);
    } catch (err) {
      console.error("Failed to fetch spot:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  const handleViewAllReviews = async () => {
    if (!id) return;
    setLoadingReviews(true);
    setShowReviews(true);
    try {
      const data = await getLocationReviews(id);
      setReviews(data);
    } catch {
      setReviews([]);
    } finally {
      setLoadingReviews(false);
    }
  };

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

          {/* Rating Card */}
          <View style={styles.ratingCard}>
            <View style={styles.ratingCardLeft}>
              <View style={styles.ratingStarsRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <MaterialIcons
                    key={star}
                    name={
                      rating &&
                      rating.averageRating !== null &&
                      star <= Math.round(rating.averageRating)
                        ? "star"
                        : "star-outline"
                    }
                    size={20}
                    color="#FFD54F"
                  />
                ))}
              </View>
              <Text style={styles.ratingScore}>
                {rating && rating.averageRating !== null
                  ? `${Number(rating.averageRating).toFixed(1)} / 5.0`
                  : "No ratings yet"}
              </Text>
              <Text style={styles.ratingCount}>
                {rating
                  ? `${rating.totalReviews} review${rating.totalReviews !== 1 ? "s" : ""}`
                  : ""}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.viewAllBtn}
              onPress={handleViewAllReviews}
              activeOpacity={0.8}
            >
              <Text style={styles.viewAllBtnText}>View All Ratings</Text>
              <MaterialIcons name="chevron-right" size={18} color="#D4501E" />
            </TouchableOpacity>
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
              <View style={styles.infoRow}>
                <MaterialIcons name="directions-car" size={20} color="#D4501E" />
                <Text style={styles.infoLabel}>Vehicles</Text>
                <View style={styles.vehicleIconsRow}>
                  {(!spot.acceptedVehicles || spot.acceptedVehicles.includes("CAR")) && (
                    <View style={styles.vehicleTag}>
                      <MaterialIcons name="directions-car" size={14} color="#D4501E" />
                      <Text style={styles.vehicleTagText}>Car</Text>
                    </View>
                  )}
                  {(!spot.acceptedVehicles || spot.acceptedVehicles.includes("MOTORCYCLE")) && (
                    <View style={styles.vehicleTag}>
                      <MaterialIcons name="two-wheeler" size={14} color="#D4501E" />
                      <Text style={styles.vehicleTagText}>Motorcycle</Text>
                    </View>
                  )}
                </View>
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
                    <Text style={styles.descriptionText}>
                      {spot.description}
                    </Text>
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
                          <Text style={styles.legendText}>
                            {available} Free
                          </Text>
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

      {/* Reviews Modal */}
      <Modal
        visible={showReviews}
        animationType="slide"
        transparent
        onRequestClose={() => setShowReviews(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: "80%" }]}>
            <View style={styles.modalHandle} />
            <View style={styles.reviewsModalHeader}>
              <Text style={styles.reviewsModalTitle}>Ratings & Reviews</Text>
              <TouchableOpacity onPress={() => setShowReviews(false)}>
                <MaterialIcons name="close" size={24} color="#A09A94" />
              </TouchableOpacity>
            </View>

            {/* Summary row */}
            <View style={styles.reviewsSummaryRow}>
              <Text style={styles.reviewsSummaryScore}>
                {rating?.averageRating !== null &&
                rating?.averageRating !== undefined
                  ? Number(rating.averageRating).toFixed(1)
                  : "—"}
              </Text>
              <View>
                <View style={{ flexDirection: "row", gap: 2 }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <MaterialIcons
                      key={star}
                      name={
                        rating?.averageRating !== null &&
                        rating?.averageRating !== undefined &&
                        star <= Math.round(rating.averageRating!)
                          ? "star"
                          : "star-outline"
                      }
                      size={18}
                      color="#FFD54F"
                    />
                  ))}
                </View>
                <Text style={styles.reviewsSummaryCount}>
                  {rating?.totalReviews ?? 0} review
                  {(rating?.totalReviews ?? 0) !== 1 ? "s" : ""}
                </Text>
              </View>
            </View>

            {loadingReviews ? (
              <ActivityIndicator
                size="large"
                color="#D4501E"
                style={{ marginVertical: 32 }}
              />
            ) : reviews.length === 0 ? (
              <View style={styles.reviewsEmpty}>
                <MaterialIcons name="star-outline" size={40} color="#C7C7CC" />
                <Text style={styles.reviewsEmptyText}>No reviews yet</Text>
              </View>
            ) : (
              <ScrollView
                showsVerticalScrollIndicator={false}
                style={{ marginTop: 12 }}
              >
                {reviews.map((review) => {
                  const name =
                    `${review.reviewer.firstName ?? ""} ${review.reviewer.lastName ?? ""}`.trim() ||
                    "Anonymous";
                  return (
                    <View key={review.id} style={styles.reviewItem}>
                      <View style={styles.reviewItemHeader}>
                        <View style={styles.reviewAvatar}>
                          {review.reviewer.profilePicture ? (
                            <Image
                              source={{ uri: review.reviewer.profilePicture }}
                              style={StyleSheet.absoluteFillObject}
                              contentFit="cover"
                            />
                          ) : (
                            <MaterialIcons
                              name="person"
                              size={18}
                              color="#fff"
                            />
                          )}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.reviewerName}>{name}</Text>
                          <Text style={styles.reviewDate}>
                            {new Date(review.createdAt).toLocaleDateString(
                              "en-PH",
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              },
                            )}
                          </Text>
                        </View>
                        <View style={styles.reviewStarsRow}>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <MaterialIcons
                              key={star}
                              name={
                                star <= review.rating ? "star" : "star-outline"
                              }
                              size={14}
                              color="#FFD54F"
                            />
                          ))}
                        </View>
                      </View>
                      {review.comment ? (
                        <Text style={styles.reviewComment}>
                          {review.comment}
                        </Text>
                      ) : null}
                    </View>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
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
<<<<<<< Updated upstream

  // Space Action Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end" as const,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 60,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D0D0D0",
    alignSelf: "center" as const,
    marginBottom: 20,
  },

  // Rating Card
  ratingCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F0EDE8",
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  ratingCardLeft: { gap: 4 },
  ratingStarsRow: { flexDirection: "row", gap: 2 },
  ratingScore: { fontSize: 18, fontWeight: "800", color: "#232230" },
  ratingCount: { fontSize: 12, color: "#A09A94", fontWeight: "500" },
  viewAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: "#FFF0EC",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FFD5C8",
  },
  viewAllBtnText: { fontSize: 13, fontWeight: "700", color: "#D4501E" },

  // Reviews Modal
  reviewsModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  reviewsModalTitle: { fontSize: 18, fontWeight: "800", color: "#232230" },
  reviewsSummaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    backgroundColor: "#FFF0EC",
    borderRadius: 14,
    padding: 16,
    marginBottom: 4,
  },
  reviewsSummaryScore: { fontSize: 40, fontWeight: "800", color: "#D4501E" },
  reviewsSummaryCount: {
    fontSize: 12,
    color: "#A09A94",
    fontWeight: "500",
    marginTop: 2,
  },
  reviewsEmpty: { alignItems: "center", paddingVertical: 32, gap: 8 },
  reviewsEmptyText: { fontSize: 14, color: "#A09A94", fontWeight: "500" },
  reviewItem: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F0EDE8",
    gap: 8,
  },
  reviewItemHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  reviewAvatar: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#D4501E",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  reviewerName: { fontSize: 13, fontWeight: "700", color: "#232230" },
  reviewDate: { fontSize: 11, color: "#A09A94", marginTop: 1 },
  reviewStarsRow: { flexDirection: "row", gap: 1 },
  reviewComment: {
    fontSize: 13,
    color: "#6B6B6B",
    lineHeight: 18,
    paddingLeft: 46,
=======
  vehicleIconsRow: {
    flexDirection: "row",
    gap: 6,
  },
  vehicleTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFF0EC",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  vehicleTagText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#D4501E",
>>>>>>> Stashed changes
  },
});
