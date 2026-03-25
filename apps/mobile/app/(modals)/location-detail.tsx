import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Modal,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Stack,
  useLocalSearchParams,
  useFocusEffect,
  router,
} from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { hostService } from "../../src/services/hosts";
import * as reservationsService from "../../src/services/reservations";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

function formatTime(time: string): string {
  const [hourStr, minuteStr] = time.split(":");
  let hour = parseInt(hourStr, 10);
  const minute = minuteStr || "00";
  const period = hour >= 12 ? "PM" : "AM";
  if (hour === 0) hour = 12;
  else if (hour > 12) hour -= 12;
  return `${hour}:${minute.padStart(2, "0")} ${period}`;
}

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
  status: "PENDING" | "APPROVED" | "REJECTED" | "DISABLED";
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
    color: "#D4501E",
    bg: "#FFF0EC",
    icon: "check-circle" as const,
  },
  PENDING: {
    label: "Pending",
    color: "#D4501E",
    bg: "#FFF0EC",
    icon: "schedule" as const,
  },
  REJECTED: {
    label: "Rejected",
    color: "#E53935",
    bg: "#FFEBEE",
    icon: "cancel" as const,
  },
  DISABLED: {
    label: "Disabled",
    color: "#A09A94",
    bg: "#F5F5F5",
    icon: "block" as const,
  },
};

const SLOT_STATUS_CONFIG = {
  AVAILABLE: { color: "#D4501E", bg: "#FFF0EC", border: "#FFD5C8", icon: "event-seat" as const },
  OCCUPIED: { color: "#A09A94", bg: "#F5F5F5", border: "#E0E0E0", icon: "event-seat" as const },
  DISABLED: { color: "#C5C5C5", bg: "#F5F5F5", border: "#E0E0E0", icon: "block" as const },
};

export default function LocationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [location, setLocation] = useState<LocationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [selectedSpace, setSelectedSpace] = useState<ParkingSpace | null>(null);
  const [spaceActionLoading, setSpaceActionLoading] = useState(false);
  const [viewingBooking, setViewingBooking] = useState(false);

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

  const handleToggleSpace = async (space: ParkingSpace) => {
    const action = space.status === "DISABLED" ? "enable" : "disable";
    Alert.alert(
      `${action === "enable" ? "Enable" : "Disable"} Space`,
      `Are you sure you want to ${action} space "${space.name || space.slotNumber}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: action === "enable" ? "Enable" : "Disable",
          style: action === "disable" ? "destructive" : "default",
          onPress: async () => {
            setSpaceActionLoading(true);
            try {
              await hostService.toggleSpace(space.id);
              setSelectedSpace(null);
              fetchLocation();
            } catch (err: any) {
              const msg =
                err?.response?.data?.message || `Failed to ${action} space.`;
              Alert.alert("Error", Array.isArray(msg) ? msg.join(", ") : msg);
            } finally {
              setSpaceActionLoading(false);
            }
          },
        },
      ],
    );
  };

  const handleDeleteSpace = async (space: ParkingSpace) => {
    Alert.alert(
      "Delete Space",
      `Are you sure you want to permanently delete space "${space.name || space.slotNumber}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setSpaceActionLoading(true);
            try {
              await hostService.deleteSpace(space.id);
              setSelectedSpace(null);
              fetchLocation();
            } catch (err: any) {
              const msg =
                err?.response?.data?.message || "Failed to delete space.";
              Alert.alert("Error", Array.isArray(msg) ? msg.join(", ") : msg);
            } finally {
              setSpaceActionLoading(false);
            }
          },
        },
      ],
    );
  };

  const handleToggleLocation = async () => {
    if (!location) return;
    const isDisabling = location.status === "APPROVED";
    const action = isDisabling ? "disable" : "enable";

    Alert.alert(
      `${isDisabling ? "Disable" : "Enable"} Location`,
      isDisabling
        ? "Disabling this location will hide it from drivers. No new reservations can be made.\n\nAre you sure?"
        : "Enabling this location will make it visible to drivers again.\n\nAre you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: isDisabling ? "Disable" : "Enable",
          style: isDisabling ? "destructive" : "default",
          onPress: async () => {
            try {
              await hostService.toggleLocation(location.id);
              fetchLocation();
            } catch (err: any) {
              const msg =
                err?.response?.data?.message || `Failed to ${action} location.`;
              Alert.alert("Error", Array.isArray(msg) ? msg.join(", ") : msg);
            }
          },
        },
      ],
    );
  };

  const handleDeleteLocation = async () => {
    if (!location) return;
    Alert.alert(
      "Delete Location",
      `Are you sure you want to permanently delete "${location.title}"? This will remove all parking spaces and cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await hostService.deleteLocation(location.id);
              Alert.alert("Deleted", "Location has been deleted.", [
                { text: "OK", onPress: () => router.back() },
              ]);
            } catch (err: any) {
              const msg =
                err?.response?.data?.message || "Failed to delete location.";
              Alert.alert("Error", Array.isArray(msg) ? msg.join(", ") : msg);
            }
          },
        },
      ],
    );
  };

  const handleViewBooking = async (space: ParkingSpace) => {
    if (!location) return;
    setViewingBooking(true);
    try {
      const reservations = await reservationsService.getHostReservations(location.id, "ACTIVE");
      const activeRes = reservations.find((r) => r.parkingSpace.id === space.id);
      if (activeRes) {
        setSelectedSpace(null);
        router.push({
          pathname: "/(modals)/host-reservation-detail",
          params: { reservation: JSON.stringify(activeRes) },
        } as any);
      } else {
        Alert.alert("Not Found", "No active booking found for this space.");
      }
    } catch {
      Alert.alert("Error", "Failed to fetch booking details.");
    } finally {
      setViewingBooking(false);
    }
  };

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
      <Stack.Screen
        options={{
          title: "Location Details",
          headerRight: () => (
            <TouchableOpacity
              style={styles.editHeaderBtn}
              onPress={() =>
                router.push({
                  pathname: "/(modals)/edit-location",
                  params: { id: location.id },
                })
              }
            >
              <MaterialIcons name="edit" size={22} color="#D4501E" />
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
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
        <View style={styles.imageGallery}>
          {location.images && location.images.length > 0 ? (
            <>
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
                {location.images
                  .sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0))
                  .map((img) => (
                    <Image
                      key={img.id}
                      source={{ uri: img.imageUrl }}
                      style={styles.carouselImage}
                      contentFit="cover"
                    />
                  ))}
              </ScrollView>
              {location.images.length > 1 && (
                <View style={styles.dotsRow}>
                  {location.images.map((_, i) => (
                    <View
                      key={i}
                      style={[styles.dot, i === activeImage && styles.dotActive]}
                    />
                  ))}
                </View>
              )}
            </>
          ) : (
            <View style={styles.noImagePlaceholder}>
              <MaterialIcons name="image" size={48} color="#C7C7CC" />
              <Text style={styles.noImageText}>No photos available</Text>
            </View>
          )}
        </View>

        {/* Badge + title + address — grouped tightly */}
        <View style={styles.locationHeader}>
          <View
            style={[styles.statusBadge, { backgroundColor: locStatus.bg, alignSelf: "flex-start" }]}
          >
            <MaterialIcons name={locStatus.icon} size={14} color={locStatus.color} />
            <Text style={[styles.statusText, { color: locStatus.color }]}>{locStatus.label}</Text>
          </View>
          <Text style={styles.locationTitle}>{location.title}</Text>
          <View style={styles.addressRow}>
            <MaterialIcons name="location-on" size={14} color="#A09A94" />
            <Text style={styles.addressText}>{location.address}</Text>
          </View>
        </View>

        {/* Single details card: price + slots + levels + hours */}
        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <MaterialIcons name="payments" size={16} color="#D4501E" />
            <Text style={styles.detailLabel}>Price</Text>
            <Text style={styles.detailValue}>₱{Number(location.basePricePerHour).toFixed(2)}/hr</Text>
          </View>
          <View style={styles.detailDivider} />
          <View style={styles.detailRow}>
            <MaterialIcons name="event-seat" size={16} color="#D4501E" />
            <Text style={styles.detailLabel}>Total Slots</Text>
            <Text style={styles.detailValue}>{location.totalSlots ?? spaces.length}</Text>
          </View>
          {location.isMultiLevel && (
            <>
              <View style={styles.detailDivider} />
              <View style={styles.detailRow}>
                <MaterialIcons name="layers" size={16} color="#D4501E" />
                <Text style={styles.detailLabel}>Levels</Text>
                <Text style={styles.detailValue}>{location.numberOfLevels ?? "-"}</Text>
              </View>
            </>
          )}
          <View style={styles.detailDivider} />
          <View style={styles.detailRow}>
            <MaterialIcons name="schedule" size={16} color="#D4501E" />
            <Text style={styles.detailLabel}>Hours</Text>
            <Text style={styles.detailValue}>
              {location.is24Hours
                ? "Open 24 Hours"
                : location.openTime && location.closeTime
                  ? `${formatTime(location.openTime)} – ${formatTime(location.closeTime)}`
                  : "Not specified"}
            </Text>
          </View>
          <View style={styles.detailDivider} />
          <View style={styles.detailRow}>
            <MaterialIcons name="calendar-today" size={16} color="#D4501E" />
            <Text style={styles.detailLabel}>Created</Text>
            <Text style={styles.detailValue}>
              {new Date(location.createdAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </Text>
          </View>
        </View>

        {/* Spaces Summary */}
        <View style={styles.overviewRow}>
          <View style={styles.overviewItem}>
            <Text style={[styles.overviewCount, { color: "#4CAF50" }]}>{availableCount}</Text>
            <Text style={styles.overviewLabel}>Available</Text>
          </View>
          <View style={styles.overviewDivider} />
          <View style={styles.overviewItem}>
            <Text style={[styles.overviewCount, { color: "#D4501E" }]}>{occupiedCount}</Text>
            <Text style={styles.overviewLabel}>Occupied</Text>
          </View>
          <View style={styles.overviewDivider} />
          <View style={styles.overviewItem}>
            <Text style={[styles.overviewCount, { color: "#9E9E9E" }]}>{disabledCount}</Text>
            <Text style={styles.overviewLabel}>Disabled</Text>
          </View>
        </View>

        {/* Spaces Grid */}
        <View style={styles.slotMapCard}>
          <Text style={styles.sectionTitle}>Slot Map</Text>
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
                            color="#232230"
                          />
                          <Text style={styles.floorTitle}>Floor {level}</Text>
                          <Text style={styles.floorCount}>
                            {levelAvail}/{levelSpaces.length} available
                          </Text>
                        </View>
                        <View style={styles.spacesGrid}>
                          {levelSpaces.map((space) => {
                            const slotConfig = SLOT_STATUS_CONFIG[space.status];
                            return (
                              <TouchableOpacity
                                key={space.id}
                                style={[
                                  styles.spaceSlot,
                                  {
                                    backgroundColor: slotConfig.bg,
                                    borderColor: slotConfig.border,
                                  },
                                ]}
                                onPress={() =>
                                  space.status === "OCCUPIED"
                                    ? handleViewBooking(space)
                                    : setSelectedSpace(space)
                                }
                                activeOpacity={0.7}
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
                              </TouchableOpacity>
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
                  return (
                    <TouchableOpacity
                      key={space.id}
                      style={[
                        styles.spaceSlot,
                        {
                          backgroundColor: slotConfig.bg,
                          borderColor: slotConfig.border,
                        },
                      ]}
                      onPress={() =>
                        space.status === "OCCUPIED"
                          ? handleViewBooking(space)
                          : setSelectedSpace(space)
                      }
                      activeOpacity={0.7}
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
                    </TouchableOpacity>
                  );
                })}
              </View>
            );
          })()
        ) : (
          <View style={styles.noSpaces}>
            <MaterialIcons name="grid-off" size={40} color="#A09A94" />
            <Text style={styles.noSpacesTitle}>No Parking Spaces</Text>
            <Text style={styles.noSpacesText}>
              This location has no individual parking spaces configured.
            </Text>
          </View>
          )}
        </View>

        {/* Disabled Banner */}
        {location.status === "DISABLED" && (
          <View style={styles.disabledBanner}>
            <MaterialIcons name="visibility-off" size={18} color="#A09A94" />
            <Text style={styles.disabledBannerText}>
              This location is hidden from drivers. No new reservations can be
              made.
            </Text>
          </View>
        )}

        {/* Action buttons: disable/enable + delete */}
        <View style={styles.actionBtnRow}>
          {(location.status === "APPROVED" || location.status === "DISABLED") && (
            <TouchableOpacity
              style={[
                styles.actionBtn,
                location.status === "DISABLED" ? styles.actionBtnEnable : styles.actionBtnDisable,
              ]}
              onPress={handleToggleLocation}
              activeOpacity={0.8}
            >
              <MaterialIcons
                name={location.status === "DISABLED" ? "visibility" : "visibility-off"}
                size={16}
                color={location.status === "DISABLED" ? "#D4501E" : "#A09A94"}
              />
              <Text style={[styles.actionBtnText, { color: location.status === "DISABLED" ? "#D4501E" : "#A09A94" }]}>
                {location.status === "DISABLED" ? "Enable" : "Disable"}
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnDelete]}
            onPress={handleDeleteLocation}
            activeOpacity={0.8}
          >
            <MaterialIcons name="delete-outline" size={16} color="#E53935" />
            <Text style={[styles.actionBtnText, { color: "#E53935" }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Space Action Modal */}
      <Modal
        visible={!!selectedSpace}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedSpace(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSelectedSpace(null)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.modalContent}>
            {selectedSpace &&
              (() => {
                const config = SLOT_STATUS_CONFIG[selectedSpace.status];
                const hasReservations = selectedSpace.reservations?.length > 0;
                return (
                  <>
                    <View style={styles.modalHandle} />

                    {/* Space info */}
                    <View style={styles.modalSpaceInfo}>
                      <View
                        style={[
                          styles.modalSpaceIcon,
                          { backgroundColor: config.bg },
                        ]}
                      >
                        <MaterialIcons
                          name={config.icon}
                          size={28}
                          color={config.color}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.modalSpaceName}>
                          Space {selectedSpace.name || selectedSpace.slotNumber}
                        </Text>
                        <Text
                          style={[
                            styles.modalSpaceStatus,
                            { color: config.color },
                          ]}
                        >
                          {selectedSpace.status === "AVAILABLE"
                            ? "Available"
                            : selectedSpace.status === "OCCUPIED"
                              ? "Occupied"
                              : "Disabled"}
                        </Text>
                      </View>
                      {selectedSpace.levelNumber != null && (
                        <View style={styles.modalFloorBadge}>
                          <Text style={styles.modalFloorText}>
                            Floor {selectedSpace.levelNumber}
                          </Text>
                        </View>
                      )}
                    </View>

                    {hasReservations && (
                      <View style={styles.modalNotice}>
                        <MaterialIcons
                          name="info-outline"
                          size={18}
                          color="#D4501E"
                        />
                        <Text style={styles.modalNoticeText}>
                          This space has active or upcoming reservations.
                        </Text>
                      </View>
                    )}

                    {/* Actions */}
                    <View style={styles.modalActions}>
                      {/* Toggle disable/enable */}
                      {selectedSpace.status !== "OCCUPIED" && (
                        <TouchableOpacity
                          style={[
                            styles.modalActionBtn,
                            selectedSpace.status === "DISABLED"
                              ? styles.modalActionBtnEnable
                              : styles.modalActionBtnDisable,
                          ]}
                          onPress={() => handleToggleSpace(selectedSpace)}
                          disabled={spaceActionLoading}
                          activeOpacity={0.8}
                        >
                          {spaceActionLoading ? (
                            <ActivityIndicator color="#fff" size="small" />
                          ) : (
                            <>
                              <MaterialIcons
                                name={
                                  selectedSpace.status === "DISABLED"
                                    ? "check-circle"
                                    : "block"
                                }
                                size={20}
                                color="#fff"
                              />
                              <Text style={styles.modalActionBtnText}>
                                {selectedSpace.status === "DISABLED"
                                  ? "Enable Space"
                                  : "Disable Space"}
                              </Text>
                            </>
                          )}
                        </TouchableOpacity>
                      )}

                      {selectedSpace.status === "OCCUPIED" && (
                        <>
                          <View style={styles.modalOccupiedNotice}>
                            <MaterialIcons
                              name="directions-car"
                              size={18}
                              color="#D4501E"
                            />
                            <Text style={styles.modalOccupiedText}>
                              This space is currently occupied. Actions are
                              unavailable until the session ends.
                            </Text>
                          </View>
                          <TouchableOpacity
                            style={styles.modalViewBookingBtn}
                            onPress={() => handleViewBooking(selectedSpace)}
                            disabled={viewingBooking}
                            activeOpacity={0.8}
                          >
                            {viewingBooking ? (
                              <ActivityIndicator color="#D4501E" size="small" />
                            ) : (
                              <>
                                <MaterialIcons name="receipt-long" size={18} color="#D4501E" />
                                <Text style={styles.modalViewBookingText}>View Active Booking</Text>
                              </>
                            )}
                          </TouchableOpacity>
                        </>
                      )}

                    </View>

                    {/* Delete + Close row */}
                    <View style={styles.modalBottomRow}>
                      <TouchableOpacity
                        style={styles.modalCloseBtn}
                        onPress={() => setSelectedSpace(null)}
                      >
                        <Text style={styles.modalCloseBtnText}>Close</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.modalDeleteBtn,
                          (hasReservations ||
                            selectedSpace.status === "OCCUPIED") &&
                            styles.modalDeleteBtnDisabled,
                        ]}
                        onPress={() => handleDeleteSpace(selectedSpace)}
                        disabled={
                          spaceActionLoading ||
                          hasReservations ||
                          selectedSpace.status === "OCCUPIED"
                        }
                        activeOpacity={0.8}
                      >
                        <MaterialIcons
                          name="delete-outline"
                          size={18}
                          color={
                            hasReservations || selectedSpace.status === "OCCUPIED"
                              ? "#E09090"
                              : "#fff"
                          }
                        />
                        <Text
                          style={[
                            styles.modalDeleteBtnText,
                            (hasReservations || selectedSpace.status === "OCCUPIED") && { color: "#E09090" },
                          ]}
                        >
                          Delete
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </>
                );
              })()}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#FFFFFF" },
  scrollContent: { padding: 16, paddingBottom: 40, gap: 16 },
  errorState: { alignItems: "center", paddingTop: 80, gap: 12 },
  errorTitle: { fontSize: 16, fontWeight: "700", color: "#232230" },

  // Info Card
  detailsCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F0EDE8",
    overflow: "hidden",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  detailLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#232230",
  },
  detailValue: {
    fontSize: 14,
    color: "#A09A94",
    fontWeight: "500",
  },
  detailDivider: {
    height: 1,
    backgroundColor: "#F0EDE8",
    marginLeft: 44,
  },
  locationHeader: {
    gap: 8,
  },
  locationTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#232230",
    letterSpacing: -0.3,
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 0,
  },
  addressText: { flex: 1, fontSize: 13, color: "#A09A94", flexShrink: 1 },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusText: { fontSize: 12, fontWeight: "700" },

  // Section
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#232230",
  },

  // Overview Row
  overviewRow: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F0EDE8",
    paddingVertical: 16,
  },
  overviewItem: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  overviewCount: {
    fontSize: 22,
    fontWeight: "800",
  },
  overviewLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#A09A94",
  },
  overviewDivider: {
    width: 1,
    backgroundColor: "#F0EDE8",
  },



  slotMapCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: "#F0EDE8",
  },

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
    backgroundColor: "#D4501E",
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
    color: "#232230",
  },
  floorCount: {
    fontSize: 12,
    color: "#A09A94",
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
  noSpacesTitle: { fontSize: 16, fontWeight: "700", color: "#232230" },
  noSpacesText: { fontSize: 13, color: "#A09A94", textAlign: "center" },

  editHeaderBtn: { marginRight: 8 },

  // Image Carousel
  imageGallery: {
    marginHorizontal: -16,
    marginTop: -16,
    marginBottom: 0,
  },
  carouselImage: {
    width: SCREEN_WIDTH,
    height: 220,
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
    height: 220,
    backgroundColor: "#E8ECF0",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  noImageText: { fontSize: 14, color: "#A09A94" },


  // Action buttons row
  actionBtnRow: {
    flexDirection: "row" as const,
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 6,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
  },
  actionBtnEnable: {
    backgroundColor: "#FFF0EC",
    borderColor: "#FFD5C8",
  },
  actionBtnDisable: {
    backgroundColor: "#F5F5F5",
    borderColor: "#E0E0E0",
  },
  actionBtnDelete: {
    backgroundColor: "#FEE8E7",
    borderColor: "#FECDD3",
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: "600" as const,
  },
  disabledBanner: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  disabledBannerText: {
    flex: 1,
    fontSize: 13,
    color: "#A09A94",
    fontWeight: "500" as const,
    lineHeight: 18,
  },

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
    paddingBottom: 40,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D0D0D0",
    alignSelf: "center" as const,
    marginBottom: 20,
  },
  modalSpaceInfo: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 14,
    marginBottom: 16,
  },
  modalSpaceIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  modalSpaceName: {
    fontSize: 18,
    fontWeight: "800" as const,
    color: "#232230",
  },
  modalSpaceStatus: {
    fontSize: 13,
    fontWeight: "600" as const,
    marginTop: 2,
  },
  modalFloorBadge: {
    backgroundColor: "#FFF0EC",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  modalFloorText: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: "#D4501E",
  },
  modalNotice: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
    backgroundColor: "#FFF8E1",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#FFE0B2",
    marginBottom: 16,
  },
  modalNoticeText: {
    flex: 1,
    fontSize: 13,
    color: "#D4501E",
    fontWeight: "500" as const,
    lineHeight: 18,
  },
  modalActions: {
    gap: 10,
    marginBottom: 16,
  },
  modalActionBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  modalActionBtnEnable: {
    backgroundColor: "#D4501E",
  },
  modalActionBtnDisable: {
    backgroundColor: "#A09A94",
  },
  modalActionBtnDelete: {
    backgroundColor: "#E53935",
  },
  modalActionBtnDeleteDisabled: {
    backgroundColor: "#E0A09E",
  },
  modalActionBtnText: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: "#fff",
  },
  modalOccupiedNotice: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
    backgroundColor: "#FFF0EC",
    borderRadius: 12,
    padding: 12,
  },
  modalOccupiedText: {
    flex: 1,
    fontSize: 13,
    color: "#D4501E",
    fontWeight: "500" as const,
    lineHeight: 18,
  },
  modalDeleteHint: {
    fontSize: 12,
    color: "#A09A94",
    textAlign: "center" as const,
    marginTop: -4,
  },
  modalViewBookingBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FFD5C8",
    backgroundColor: "#FFF0EC",
  },
  modalViewBookingText: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: "#D4501E",
  },
  modalBottomRow: {
    flexDirection: "row" as const,
    gap: 10,
    marginTop: 4,
  },
  modalCloseBtn: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F0EDE8",
    backgroundColor: "#F5F5F5",
  },
  modalCloseBtnText: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: "#A09A94",
  },
  modalDeleteBtn: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#E53935",
  },
  modalDeleteBtnDisabled: {
    backgroundColor: "#F5C6C5",
  },
  modalDeleteBtnText: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: "#fff",
  },
});
