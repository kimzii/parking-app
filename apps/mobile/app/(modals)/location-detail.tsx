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
  DISABLED: {
    label: "Disabled",
    color: "#8E8E93",
    bg: "#F5F5F5",
    icon: "block" as const,
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
  const [selectedSpace, setSelectedSpace] = useState<ParkingSpace | null>(null);
  const [spaceActionLoading, setSpaceActionLoading] = useState(false);

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
              <MaterialIcons name="edit" size={22} color="#11796F" />
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
                <Text style={styles.timeValue}>
                  {formatTime(location.openTime!)}
                </Text>
                <Text style={styles.timeLabel}>Opens</Text>
              </View>
              <View style={styles.timeSeparator}>
                <MaterialIcons name="arrow-forward" size={16} color="#8E8E93" />
              </View>
              <View style={styles.timeBlock}>
                <MaterialIcons name="nights-stay" size={16} color="#5C6BC0" />
                <Text style={styles.timeValue}>
                  {formatTime(location.closeTime!)}
                </Text>
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
                              <TouchableOpacity
                                key={space.id}
                                style={[
                                  styles.spaceSlot,
                                  {
                                    backgroundColor: slotConfig.bg,
                                    borderColor: slotConfig.color,
                                  },
                                ]}
                                onPress={() => setSelectedSpace(space)}
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
                                {hasActiveReservation && (
                                  <View style={styles.activeIndicator}>
                                    <MaterialIcons
                                      name="directions-car"
                                      size={10}
                                      color="#fff"
                                    />
                                  </View>
                                )}
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
                  const hasActiveReservation = space.reservations?.length > 0;
                  return (
                    <TouchableOpacity
                      key={space.id}
                      style={[
                        styles.spaceSlot,
                        {
                          backgroundColor: slotConfig.bg,
                          borderColor: slotConfig.color,
                        },
                      ]}
                      onPress={() => setSelectedSpace(space)}
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
                      {hasActiveReservation && (
                        <View style={styles.activeIndicator}>
                          <MaterialIcons
                            name="directions-car"
                            size={10}
                            color="#fff"
                          />
                        </View>
                      )}
                    </TouchableOpacity>
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

        {/* Disabled Banner */}
        {location.status === "DISABLED" && (
          <View style={styles.disabledBanner}>
            <MaterialIcons name="visibility-off" size={18} color="#8E8E93" />
            <Text style={styles.disabledBannerText}>
              This location is hidden from drivers. No new reservations can be
              made.
            </Text>
          </View>
        )}

        {/* Disable / Enable Location */}
        {(location.status === "APPROVED" || location.status === "DISABLED") && (
          <TouchableOpacity
            style={[
              styles.toggleLocationBtn,
              location.status === "DISABLED"
                ? styles.toggleLocationBtnEnable
                : styles.toggleLocationBtnDisable,
            ]}
            onPress={handleToggleLocation}
            activeOpacity={0.8}
          >
            <MaterialIcons
              name={
                location.status === "DISABLED" ? "visibility" : "visibility-off"
              }
              size={20}
              color="#fff"
            />
            <Text style={styles.toggleLocationBtnText}>
              {location.status === "DISABLED"
                ? "Enable Location"
                : "Disable Location"}
            </Text>
          </TouchableOpacity>
        )}

        {/* Delete Location */}
        <TouchableOpacity
          style={styles.deleteLocationBtn}
          onPress={handleDeleteLocation}
          activeOpacity={0.8}
        >
          <MaterialIcons name="delete-outline" size={20} color="#E53935" />
          <Text style={styles.deleteLocationBtnText}>Delete Location</Text>
        </TouchableOpacity>
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
                          color="#F57C00"
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
                        <View style={styles.modalOccupiedNotice}>
                          <MaterialIcons
                            name="directions-car"
                            size={18}
                            color="#F57C00"
                          />
                          <Text style={styles.modalOccupiedText}>
                            This space is currently occupied. Actions are
                            unavailable until the session ends.
                          </Text>
                        </View>
                      )}

                      {/* Delete */}
                      <TouchableOpacity
                        style={[
                          styles.modalActionBtn,
                          styles.modalActionBtnDelete,
                          (hasReservations ||
                            selectedSpace.status === "OCCUPIED") &&
                            styles.modalActionBtnDeleteDisabled,
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
                          size={20}
                          color="#fff"
                        />
                        <Text style={styles.modalActionBtnText}>
                          Delete Space
                        </Text>
                      </TouchableOpacity>

                      {(hasReservations ||
                        selectedSpace.status === "OCCUPIED") && (
                        <Text style={styles.modalDeleteHint}>
                          Spaces with active reservations cannot be deleted.
                          Disable them instead.
                        </Text>
                      )}
                    </View>

                    {/* Close */}
                    <TouchableOpacity
                      style={styles.modalCloseBtn}
                      onPress={() => setSelectedSpace(null)}
                    >
                      <Text style={styles.modalCloseBtnText}>Close</Text>
                    </TouchableOpacity>
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
  editHeaderBtn: { marginRight: 8 },

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

  // Toggle Location
  toggleLocationBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  toggleLocationBtnEnable: {
    backgroundColor: "#11796F",
  },
  toggleLocationBtnDisable: {
    backgroundColor: "#8E8E93",
  },
  toggleLocationBtnText: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: "#fff",
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
    color: "#8E8E93",
    fontWeight: "500" as const,
    lineHeight: 18,
  },
  deleteLocationBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#E53935",
    backgroundColor: "#fff",
  },
  deleteLocationBtnText: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: "#E53935",
  },

  // Space Action Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end" as const,
  },
  modalContent: {
    backgroundColor: "#F8FAFB",
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
    color: "#1A1A2E",
  },
  modalSpaceStatus: {
    fontSize: 13,
    fontWeight: "600" as const,
    marginTop: 2,
  },
  modalFloorBadge: {
    backgroundColor: "#E8F5F3",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  modalFloorText: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: "#11796F",
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
    color: "#F57C00",
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
    backgroundColor: "#11796F",
  },
  modalActionBtnDisable: {
    backgroundColor: "#8E8E93",
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
    backgroundColor: "#FFF3E0",
    borderRadius: 12,
    padding: 12,
  },
  modalOccupiedText: {
    flex: 1,
    fontSize: 13,
    color: "#F57C00",
    fontWeight: "500" as const,
    lineHeight: 18,
  },
  modalDeleteHint: {
    fontSize: 12,
    color: "#8E8E93",
    textAlign: "center" as const,
    marginTop: -4,
  },
  modalCloseBtn: {
    alignItems: "center" as const,
    paddingVertical: 14,
  },
  modalCloseBtnText: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: "#8E8E93",
  },
});
