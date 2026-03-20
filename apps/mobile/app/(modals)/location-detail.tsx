import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useFocusEffect } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { hostService } from "../../src/services/hosts";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface ParkingSpace {
  id: string;
  slotNumber: number;
  name: string | null;
  levelNumber: number | null;
  status: "AVAILABLE" | "OCCUPIED" | "DISABLED";
  isActive: boolean;
  reservations: { id: string; status: string }[];
}

interface LocationDetail {
  id: string;
  title: string;
  description: string | null;
  address: string;
  latitude: string;
  longitude: string;
  basePricePerHour: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  totalSlots: number | null;
  availableSlots: number | null;
  isMultiLevel: boolean;
  numberOfLevels: number | null;
  openTime: string | null;
  closeTime: string | null;
  is24Hours: boolean;
  proofOfResidenceUrl: string | null;
  createdAt: string;
  images: { id: string; imageUrl: string; isPrimary: boolean }[];
  parkingSpaces: ParkingSpace[];
  _count: { parkingSpaces: number };
}

const STATUS_CONFIG = {
  APPROVED: {
    label: "Approved",
    color: "#4CAF50",
    bg: "#E8F5E9",
    icon: "check-circle" as const,
  },
  PENDING: {
    label: "Pending",
    color: "#F57C00",
    bg: "#FFF3E0",
    icon: "schedule" as const,
  },
  REJECTED: {
    label: "Rejected",
    color: "#E53935",
    bg: "#FFEBEE",
    icon: "cancel" as const,
  },
};

const SLOT_STATUS_CONFIG = {
  AVAILABLE: { color: "#4CAF50", bg: "#E8F5E9", icon: "event-seat" as const },
  OCCUPIED: { color: "#F57C00", bg: "#FFF3E0", icon: "event-busy" as const },
  DISABLED: { color: "#9E9E9E", bg: "#F5F5F5", icon: "block" as const },
};

export default function LocationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [location, setLocation] = useState<LocationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLocation = useCallback(async () => {
    if (!id) return;
    try {
      const data = await hostService.getLocation(id);
      setLocation(data);
    } catch (err) {
      console.error("Failed to fetch location:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      fetchLocation();
    }, [fetchLocation]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchLocation();
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

  if (!location) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["left", "right", "bottom"]}>
        <View style={styles.errorState}>
          <MaterialIcons name="error-outline" size={48} color="#E53935" />
          <Text style={styles.errorTitle}>Location not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const locStatus = STATUS_CONFIG[location.status];
  const spaces = location.parkingSpaces || [];
  const availableCount = spaces.filter((s) => s.status === "AVAILABLE").length;
  const occupiedCount = spaces.filter((s) => s.status === "OCCUPIED").length;
  const disabledCount = spaces.filter((s) => s.status === "DISABLED").length;

  return (
    <SafeAreaView style={styles.safeArea} edges={["left", "right", "bottom"]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#11796F"
          />
        }
      >
        {/* Image Gallery */}
        {location.images && location.images.length > 0 && (
          <View style={styles.imageGallery}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.imageScrollContent}
            >
              {location.images
                .sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0))
                .map((img, index) => (
                  <View key={img.id} style={styles.galleryImageWrapper}>
                    <Image
                      source={{ uri: img.imageUrl }}
                      style={styles.galleryImage}
                      contentFit="cover"
                    />
                    {img.isPrimary && (
                      <View style={styles.primaryImageBadge}>
                        <Text style={styles.primaryImageText}>Primary</Text>
                      </View>
                    )}
                  </View>
                ))}
            </ScrollView>
          </View>
        )}

        {/* Location Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.titleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.locationTitle}>{location.title}</Text>
              <View style={styles.addressRow}>
                <MaterialIcons name="location-on" size={14} color="#8E8E93" />
                <Text style={styles.addressText} numberOfLines={2}>
                  {location.address}
                </Text>
              </View>
            </View>
            <View
              style={[styles.statusBadge, { backgroundColor: locStatus.bg }]}
            >
              <MaterialIcons
                name={locStatus.icon}
                size={14}
                color={locStatus.color}
              />
              <Text style={[styles.statusText, { color: locStatus.color }]}>
                {locStatus.label}
              </Text>
            </View>
          </View>

          {location.description ? (
            <Text style={styles.description}>{location.description}</Text>
          ) : null}

          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <MaterialIcons name="payments" size={18} color="#11796F" />
              <Text style={styles.infoLabel}>Price</Text>
              <Text style={styles.infoValue}>
                ₱{Number(location.basePricePerHour).toFixed(2)}/hr
              </Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoItem}>
              <MaterialIcons name="event-seat" size={18} color="#11796F" />
              <Text style={styles.infoLabel}>Total Slots</Text>
              <Text style={styles.infoValue}>
                {location.totalSlots ?? spaces.length}
              </Text>
            </View>
            {location.isMultiLevel && (
              <>
                <View style={styles.infoDivider} />
                <View style={styles.infoItem}>
                  <MaterialIcons name="layers" size={18} color="#11796F" />
                  <Text style={styles.infoLabel}>Levels</Text>
                  <Text style={styles.infoValue}>
                    {location.numberOfLevels ?? "-"}
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Operating Hours */}
        <View style={styles.operatingHoursCard}>
          <View style={styles.operatingHoursHeader}>
            <MaterialIcons name="schedule" size={18} color="#11796F" />
            <Text style={styles.operatingHoursTitle}>Operating Hours</Text>
          </View>
          {location.is24Hours ? (
            <View style={styles.hours24Badge}>
              <MaterialIcons name="all-inclusive" size={16} color="#11796F" />
              <Text style={styles.hours24Text}>Open 24 Hours</Text>
            </View>
          ) : location.openTime && location.closeTime ? (
            <View style={styles.hoursDisplay}>
              <View style={styles.timeBlock}>
                <MaterialIcons name="wb-sunny" size={16} color="#F57C00" />
                <Text style={styles.timeValue}>{location.openTime}</Text>
                <Text style={styles.timeLabel}>Opens</Text>
              </View>
              <View style={styles.timeSeparator}>
                <MaterialIcons name="arrow-forward" size={16} color="#8E8E93" />
              </View>
              <View style={styles.timeBlock}>
                <MaterialIcons name="nights-stay" size={16} color="#5C6BC0" />
                <Text style={styles.timeValue}>{location.closeTime}</Text>
                <Text style={styles.timeLabel}>Closes</Text>
              </View>
            </View>
          ) : (
            <Text style={styles.noHoursText}>Hours not specified</Text>
          )}
        </View>

        {/* Spaces Summary */}
        <Text style={styles.sectionTitle}>Parking Spaces Overview</Text>
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { borderLeftColor: "#4CAF50" }]}>
            <Text style={[styles.summaryCount, { color: "#4CAF50" }]}>
              {availableCount}
            </Text>
            <Text style={styles.summaryLabel}>Available</Text>
          </View>
          <View style={[styles.summaryCard, { borderLeftColor: "#F57C00" }]}>
            <Text style={[styles.summaryCount, { color: "#F57C00" }]}>
              {occupiedCount}
            </Text>
            <Text style={styles.summaryLabel}>Occupied</Text>
          </View>
          <View style={[styles.summaryCard, { borderLeftColor: "#9E9E9E" }]}>
            <Text style={[styles.summaryCount, { color: "#9E9E9E" }]}>
              {disabledCount}
            </Text>
            <Text style={styles.summaryLabel}>Disabled</Text>
          </View>
        </View>

        {/* Spaces Grid */}
        <View style={styles.legendRow}>
          <Text style={styles.sectionTitle}>Slot Map</Text>
          <View style={styles.legendItems}>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: "#4CAF50" }]}
              />
              <Text style={styles.legendText}>Free</Text>
            </View>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: "#F57C00" }]}
              />
              <Text style={styles.legendText}>Busy</Text>
            </View>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: "#9E9E9E" }]}
              />
              <Text style={styles.legendText}>Off</Text>
            </View>
          </View>
        </View>

        {spaces.length > 0 ? (
          (() => {
            const hasLevels = spaces.some((s) => s.levelNumber != null);
            if (hasLevels) {
              const levelMap = new Map<number, ParkingSpace[]>();
              spaces.forEach((s) => {
                const lvl = s.levelNumber ?? 0;
                if (!levelMap.has(lvl)) levelMap.set(lvl, []);
                levelMap.get(lvl)!.push(s);
              });
              const sortedLevels = [...levelMap.keys()].sort((a, b) => a - b);
              return (
                <View style={{ gap: 16 }}>
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
                          <Text style={styles.floorTitle}>Floor {level}</Text>
                          <Text style={styles.floorCount}>
                            {levelAvail}/{levelSpaces.length} available
                          </Text>
                        </View>
                        <View style={styles.spacesGrid}>
                          {levelSpaces.map((space) => {
                            const slotConfig = SLOT_STATUS_CONFIG[space.status];
                            const hasActiveReservation =
                              space.reservations?.length > 0;
                            return (
                              <View
                                key={space.id}
                                style={[
                                  styles.spaceSlot,
                                  {
                                    backgroundColor: slotConfig.bg,
                                    borderColor: slotConfig.color,
                                  },
                                ]}
                              >
                                <MaterialIcons
                                  name={slotConfig.icon}
                                  size={20}
                                  color={slotConfig.color}
                                />
                                <Text
                                  style={[
                                    styles.slotNumber,
                                    { color: slotConfig.color },
                                  ]}
                                >
                                  {space.name || space.slotNumber}
                                </Text>
                                {hasActiveReservation && (
                                  <View style={styles.activeIndicator}>
                                    <MaterialIcons
                                      name="directions-car"
                                      size={10}
                                      color="#fff"
                                    />
                                  </View>
                                )}
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
              <View style={styles.spacesGrid}>
                {spaces.map((space) => {
                  const slotConfig = SLOT_STATUS_CONFIG[space.status];
                  const hasActiveReservation = space.reservations?.length > 0;
                  return (
                    <View
                      key={space.id}
                      style={[
                        styles.spaceSlot,
                        {
                          backgroundColor: slotConfig.bg,
                          borderColor: slotConfig.color,
                        },
                      ]}
                    >
                      <MaterialIcons
                        name={slotConfig.icon}
                        size={20}
                        color={slotConfig.color}
                      />
                      <Text
                        style={[styles.slotNumber, { color: slotConfig.color }]}
                      >
                        {space.name || space.slotNumber}
                      </Text>
                      {hasActiveReservation && (
                        <View style={styles.activeIndicator}>
                          <MaterialIcons
                            name="directions-car"
                            size={10}
                            color="#fff"
                          />
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            );
          })()
        ) : (
          <View style={styles.noSpaces}>
            <MaterialIcons name="grid-off" size={40} color="#8E8E93" />
            <Text style={styles.noSpacesTitle}>No Parking Spaces</Text>
            <Text style={styles.noSpacesText}>
              This location has no individual parking spaces configured.
            </Text>
          </View>
        )}

        {/* Created date */}
        <View style={styles.metaCard}>
          <MaterialIcons name="schedule" size={16} color="#8E8E93" />
          <Text style={styles.metaText}>
            Created{" "}
            {new Date(location.createdAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8FAFB" },
  scrollContent: { padding: 16, paddingBottom: 40, gap: 16 },
  errorState: { alignItems: "center", paddingTop: 80, gap: 12 },
  errorTitle: { fontSize: 16, fontWeight: "700", color: "#1A1A2E" },

  // Info Card
  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 18,
    gap: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  locationTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1A1A2E",
    letterSpacing: -0.3,
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  addressText: { flex: 1, fontSize: 13, color: "#8E8E93" },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusText: { fontSize: 12, fontWeight: "700" },
  description: {
    fontSize: 14,
    color: "#555",
    lineHeight: 20,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFB",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  infoItem: { flex: 1, alignItems: "center", gap: 4 },
  infoLabel: { fontSize: 11, color: "#8E8E93", fontWeight: "600" },
  infoValue: { fontSize: 16, fontWeight: "800", color: "#1A1A2E" },
  infoDivider: { width: 1, height: 36, backgroundColor: "#E0E0E0" },

  // Section
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A2E",
  },

  // Summary Row
  summaryRow: {
    flexDirection: "row",
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    borderLeftWidth: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  summaryCount: {
    fontSize: 22,
    fontWeight: "800",
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#8E8E93",
    marginTop: 2,
  },

  // Legend
  legendRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  legendItems: { flexDirection: "row", gap: 12 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: "#8E8E93", fontWeight: "600" },

  // Spaces Grid
  spacesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  spaceSlot: {
    width: Math.floor((SCREEN_WIDTH - 72) / 5),
    height: Math.floor((SCREEN_WIDTH - 72) / 5),
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  slotNumber: {
    fontSize: 13,
    fontWeight: "800",
  },
  activeIndicator: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#F57C00",
    alignItems: "center",
    justifyContent: "center",
  },

  // Floor headers
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

  // No Spaces
  noSpaces: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    gap: 8,
  },
  noSpacesTitle: { fontSize: 16, fontWeight: "700", color: "#1A1A2E" },
  noSpacesText: { fontSize: 13, color: "#8E8E93", textAlign: "center" },

  // Meta
  metaCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    justifyContent: "center",
    paddingTop: 4,
  },
  metaText: { fontSize: 12, color: "#8E8E93" },

  // Image Gallery
  imageGallery: {
    marginHorizontal: -16,
    marginTop: -16,
    marginBottom: 0,
  },
  imageScrollContent: {
    paddingHorizontal: 16,
    gap: 10,
  },
  galleryImageWrapper: {
    width: SCREEN_WIDTH * 0.75,
    height: SCREEN_WIDTH * 0.48,
    borderRadius: 16,
    overflow: "hidden",
  },
  galleryImage: {
    width: "100%",
    height: "100%",
  },
  primaryImageBadge: {
    position: "absolute",
    bottom: 8,
    left: 8,
    backgroundColor: "rgba(17,121,111,0.9)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  primaryImageText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },

  // Operating Hours
  operatingHoursCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  operatingHoursHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  operatingHoursTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1A1A2E",
  },
  hours24Badge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#E8F5F3",
    borderRadius: 10,
    paddingVertical: 12,
  },
  hours24Text: {
    fontSize: 15,
    fontWeight: "700",
    color: "#11796F",
  },
  hoursDisplay: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  timeBlock: {
    alignItems: "center",
    gap: 4,
  },
  timeValue: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1A1A2E",
  },
  timeLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#8E8E93",
  },
  timeSeparator: {
    paddingHorizontal: 8,
  },
  noHoursText: {
    fontSize: 13,
    color: "#8E8E93",
    textAlign: "center",
  },
});
