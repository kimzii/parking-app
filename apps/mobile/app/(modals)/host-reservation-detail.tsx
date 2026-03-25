import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import * as reservationsService from "../../src/services/reservations";

const VEHICLE_IMAGES: Record<string, any> = {
  CAR: require("../../assets/images/ParkUp UI/sedan_14703757.png"),
  MOTORCYCLE: require("../../assets/images/ParkUp UI/scooter_16804043.png"),
};

const STATUS_CONFIG: Record<
  string,
  { color: string; bg: string; label: string; icon: string }
> = {
  PENDING: {
    color: "#D4501E",
    bg: "#FFF0EC",
    label: "Pending Approval",
    icon: "hourglass-top",
  },
  CONFIRMED: {
  color: "#D4501E",
  bg: "#FFF0EC",
  label: "Confirmed",
  icon: "directions-car",
  },
  ACTIVE: {
    color: "#4CAF50",
    bg: "#F0FBF1",
    label: "Active",
    icon: "directions-car",
  },
  COMPLETED: {
    color: "#A09A94",
    bg: "#F5F5F5",
    label: "Completed",
    icon: "done-all",
  },
  CANCELLED: {
    color: "#E53935",
    bg: "#FFEBEE",
    label: "Cancelled",
    icon: "cancel",
  },
  EXPIRED: {
    color: "#9E9E9E",
    bg: "#F5F5F5",
    label: "Expired",
    icon: "timer-off",
  },
};

function formatDuration(startedAt: string, endedAt?: string | null): string {
  const start = new Date(startedAt);
  const end = endedAt ? new Date(endedAt) : new Date();
  const totalMins = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

export default function HostReservationDetailScreen() {
  const params = useLocalSearchParams<{ reservation?: string; id?: string }>();
  const [reservation, setReservation] =
    useState<reservationsService.HostReservation | null>(null);
  const [actionLoading, setActionLoading] = useState<"approve" | "reject" | null>(null);

  useEffect(() => {
    if (params.reservation) {
      try {
        setReservation(
          JSON.parse(params.reservation) as reservationsService.HostReservation,
        );
      } catch {
        console.error("Failed to parse reservation data");
      }
    } else if (params.id) {
      reservationsService
        .getHostReservation(params.id)
        .then(setReservation)
        .catch(() => Alert.alert("Error", "Failed to load reservation details."));
    }
  }, [params.reservation, params.id]);

  const handleApprove = () => {
    if (!reservation) return;
    Alert.alert("Approve Booking", "Approve this booking request?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Approve",
        onPress: async () => {
          setActionLoading("approve");
          try {
            await reservationsService.approveReservation(reservation.id);
            setReservation((r) => r ? { ...r, status: "CONFIRMED" } : r);
          } catch (err: any) {
            Alert.alert("Failed", err.response?.data?.message || "Could not approve reservation.");
          } finally {
            setActionLoading(null);
          }
        },
      },
    ]);
  };

  const handleReject = () => {
    if (!reservation) return;
    Alert.alert("Reject Booking", "Reject this request? The driver will be refunded.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Reject",
        style: "destructive",
        onPress: async () => {
          setActionLoading("reject");
          try {
            await reservationsService.rejectReservation(reservation.id);
            setReservation((r) => r ? { ...r, status: "CANCELLED" } : r);
          } catch (err: any) {
            Alert.alert("Failed", err.response?.data?.message || "Could not reject reservation.");
          } finally {
            setActionLoading(null);
          }
        },
      },
    ]);
  };

  if (!reservation) {
    return (
      <SafeAreaView
        style={styles.container}
        edges={["left", "right", "bottom"]}
      >
        <Stack.Screen options={{ title: "Reservation" }} />
        <ActivityIndicator
          size="large"
          color="#D4501E"
          style={{ marginTop: 40 }}
        />
      </SafeAreaView>
    );
  }

  const slotName = reservation.parkingSpace.name?.trim() || "Unnamed Spot";
  const bookedSpot = slotName;

  return (
    <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
      <Stack.Screen options={{ title: "Reservation Details" }} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Session state (host view) */}
        {reservation.status === "ACTIVE" && !reservation.sessionEndedAt && (
          <View style={styles.sessionChipRowStandalone}>
            <View style={styles.sessionChip}>
              <MaterialIcons name="directions-car" size={14} color="#4CAF50" />
              <Text style={styles.sessionChipText}>Session Active</Text>
            </View>
          </View>
        )}

        {/* Driver Profile */}
        <View style={styles.driverCard}>
          <View style={styles.driverMainRow}>
            {reservation.driver?.image ? (
              <Image
                source={{ uri: reservation.driver.image }}
                style={styles.driverImage}
              />
            ) : (
              <View style={styles.driverImagePlaceholder}>
                <MaterialIcons name="person" size={40} color="#C7C7CC" />
              </View>
            )}
            <View style={styles.driverInfoColumn}>
              <Text style={styles.driverDisplayName}>
                {reservation.driver?.name || "Driver"}
              </Text>
              <Text style={styles.driverPhone} numberOfLines={1}>
                {reservation.driver?.phone || "No phone provided"}
              </Text>
            </View>
          </View>
        </View>

        {/* Vehicle Details */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Vehicle</Text>
          <View style={styles.infoCard}>
            {reservation.driver?.vehicle ? (
              <>
                <View style={styles.vehicleHeader}>
                  <View style={styles.vehicleIconBg}>
                    <Image
                      source={
                        VEHICLE_IMAGES[
                          reservation.driver.vehicle.vehicleType ?? "CAR"
                        ] || VEHICLE_IMAGES.CAR
                      }
                      style={styles.vehiclePng}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.vehicleName}>
                      {[
                        reservation.driver.vehicle.brand,
                        reservation.driver.vehicle.model,
                      ]
                        .filter(Boolean)
                        .join(" ") || "Vehicle"}
                    </Text>
                    {reservation.driver.vehicle.color && (
                      <Text style={styles.vehicleSubtext}>
                        {reservation.driver.vehicle.color}
                      </Text>
                    )}
                  </View>
                  {reservation.driver.vehicle.plateNumber && (
                    <View style={styles.plateBadgeInline}>
                      <Text style={styles.plateTextInline}>
                        {reservation.driver.vehicle.plateNumber}
                      </Text>
                    </View>
                  )}
                </View>
              </>
            ) : (
              <View style={styles.infoRow}>
                <MaterialIcons
                  name="directions-car"
                  size={18}
                  color="#A09A94"
                />
                <Text style={styles.infoText}>No active vehicle provided</Text>
              </View>
            )}
          </View>
        </View>

        {/* Parking Details */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Parking Details</Text>
          <View style={styles.infoCard}>
            <View style={[styles.infoRow, { alignItems: "flex-start" }]}>
              <MaterialIcons
                name="location-on"
                size={18}
                color="#D4501E"
                style={{ marginTop: 2 }}
              />
              <View style={{ flex: 1 }}>
                <Text style={[styles.infoTitle, { marginBottom: 2 }]}>
                  {reservation.parkingLocation.title}
                </Text>
                {reservation.parkingLocation.address ? (
                  <Text style={[styles.infoSubtext, { marginBottom: 4 }]}>
                    {reservation.parkingLocation.address}
                  </Text>
                ) : null}
                <View style={styles.spotPillRow}>
                  <View style={styles.spotPill}>
                    <MaterialIcons
                      name="event-seat"
                      size={14}
                      color="#D4501E"
                    />
                    <Text style={styles.spotPillText}>{bookedSpot}</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Session Details */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Session</Text>
          <View style={styles.infoCard}>
            <View style={styles.sessionRow}>
              <View style={styles.sessionRowLeft}>
                <MaterialIcons
                  name="access-time"
                  size={18}
                  color="#D4501E"
                />
                <Text style={styles.sessionLabel}>Booked at</Text>
              </View>
              <Text style={styles.sessionValue}>
                {reservation.createdAt
                  ? new Date(reservation.createdAt).toLocaleString([], {
                      month: "short",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    })
                  : "-"}
              </Text>
            </View>

            <View style={styles.sessionRow}>
              <View style={styles.sessionRowLeft}>
                <MaterialIcons
                  name="login"
                  size={18}
                  color="#D4501E"
                />
                <Text style={styles.sessionLabel}>Checked In</Text>
              </View>
              <Text style={[styles.sessionValue, styles.sessionValueHighlight]}>
                {reservation.sessionStartedAt
                  ? new Date(
                      reservation.sessionStartedAt,
                    ).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    })
                  : "-"}
              </Text>
            </View>

            <View style={styles.sessionRow}>
              <View style={styles.sessionRowLeft}>
                <MaterialIcons name="timer" size={18} color="#D4501E" />
                <Text style={styles.sessionLabel}>Duration</Text>
              </View>
              <Text style={[styles.sessionValue, styles.sessionValueHighlight]}>
                {reservation.sessionStartedAt
                  ? formatDuration(reservation.sessionStartedAt, reservation.sessionEndedAt)
                  : "-"}
              </Text>
            </View>
          </View>
        </View>

        {/* Payment */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Payment</Text>
          <View style={styles.infoCard}>
            <View style={styles.amountMainRow}>
              <Text style={styles.amountLabel}>First Hour (upfront)</Text>
              <Text style={styles.amountValue}>
                ₱
                {Number(reservation.totalAmount || 0).toFixed(2)}
              </Text>
            </View>

            {reservation.parkingLocation.basePricePerHour && (
              <View style={[styles.amountMainRow, { marginTop: 6 }]}>
                <Text style={styles.amountLabel}>Rate</Text>
                <Text style={styles.amountValue}>
                  ₱
                  {Number(
                    reservation.parkingLocation.basePricePerHour,
                  ).toFixed(2)}
                  /hr
                </Text>
              </View>
            )}

            <Text style={styles.overtimeText}>
              Additional charges apply based on session duration
            </Text>
          </View>
        </View>

        {/* Approve / Reject — PENDING only */}
        {reservation.status === "PENDING" && (
          <View style={styles.actionBtns}>
            <TouchableOpacity
              style={styles.rejectBtn}
              onPress={handleReject}
              activeOpacity={0.7}
              disabled={actionLoading !== null}
            >
              {actionLoading === "reject" ? (
                <ActivityIndicator size="small" color="#E53935" />
              ) : (
                <>
                  <MaterialIcons name="close" size={18} color="#E53935" />
                  <Text style={styles.rejectBtnText}>Reject</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={handleApprove}
              activeOpacity={0.7}
              disabled={actionLoading !== null}
            >
              {actionLoading === "approve" ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <MaterialIcons name="check" size={18} color="#fff" />
                  <Text style={styles.confirmBtnText}>Approve</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Rate Driver */}
        {reservation.status === "COMPLETED" && (
          <TouchableOpacity
            style={styles.reviewBtn}
            onPress={() =>
              router.push({
                pathname: "/(modals)/leave-review",
                params: {
                  reservationId: reservation.id,
                  locationTitle: reservation.driver?.name || "Driver",
                  reviewType: "host",
                },
              })
            }
            activeOpacity={0.7}
          >
            <MaterialIcons name="star" size={20} color="#FFB300" />
            <Text style={styles.reviewBtnText}>Rate Driver</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  scrollContent: {
  paddingHorizontal: 20,
  paddingTop: 16,
  paddingBottom: 32,
  },

  // Driver Profile / Session Header
  driverSection: {
    marginBottom: 12,
  },
  driverCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 16,
  },
  driverMainRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    width: "100%",
    paddingHorizontal: 4,
  },
  driverImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
    marginBottom: 14,
    borderWidth: 3,
    borderColor: "#FFF0EC",
  },
  driverImagePlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
    borderWidth: 3,
    borderColor: "#FFF0EC",
  },
  driverDisplayName: {
    fontSize: 22,
    fontWeight: "800",
    color: "#232230",
  marginBottom: 2,
  },
  driverPhone: {
    fontSize: 14,
    color: "#A09A94",
    marginBottom: 2,
  },
  driverInfoColumn: {
    flex: 1,
  },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusChipText: {
    fontSize: 13,
    fontWeight: "700",
  },
  sessionChipRowStandalone: {
  flexDirection: "row",
  justifyContent: "center",
  marginBottom: 12,
  },
  sessionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  paddingHorizontal: 16,
  paddingVertical: 8,
  borderRadius: 999,
  backgroundColor: "#F5F4F2",
  },
  sessionChipText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#4CAF50",
  },

  // Section
  section: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#000",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#232230",
  },
  infoSubtext: {
    fontSize: 13,
    color: "#A09A94",
    marginTop: 2,
  },
  infoText: {
  fontSize: 13,
  fontWeight: "500",
  color: "#232230",
  },
  timeDivider: {
    height: 1,
    backgroundColor: "#F0F0F0",
    marginVertical: 10,
  },

  // Vehicle
  vehicleHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  vehicleIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#FFF0EC",
    justifyContent: "center",
    alignItems: "center",
  },
  vehiclePng: {
    width: 28,
    height: 28,
    tintColor: "#D4501E",
  },
  vehicleName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#232230",
  },
  vehicleSubtext: {
    fontSize: 13,
    color: "#A09A94",
    marginTop: 2,
  },
  plateRow: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    alignItems: "center",
  },
  plateBadge: {
    backgroundColor: "#F5F5F5",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  plateText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#232230",
    letterSpacing: 1,
  },

  // Inline plate badge (compact, matches vehicle edit style)
  plateBadgeInline: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D4501E",
    backgroundColor: "#ffffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  plateTextInline: {
    fontSize: 12,
    fontWeight: "700",
    color: "#D4501E",
    letterSpacing: 0.5,
  },

  // Amount
  amountMainRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  amountLabel: {
    fontSize: 15,
    color: "#A09A94",
  },
  amountValue: {
    fontSize: 20,
    fontWeight: "800",
    color: "#D4501E",
  },
  overtimeText: {
    fontSize: 12,
    color: "#E53935",
    marginTop: 6,
  },

  // Action Buttons
  actionBtns: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  rejectBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#FFEBEE",
  },
  rejectBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#E53935",
  },
  confirmBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#D4501E",
  },
  confirmBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },

  // Review Button
  reviewBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FFF8E1",
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#FFE0B2",
  },
  reviewBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFB300",
  },
  spotPillRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  spotPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "#F5F4F2",
    gap: 4,
  },
  spotPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#D4501E",
  },
  sessionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  sessionRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sessionLabel: {
    fontSize: 13,
    color: "#A09A94",
  },
  sessionValue: {
    fontSize: 13,
    color: "#232230",
  },
  sessionValueHighlight: {
    color: "#D4501E",
    fontWeight: "600",
  },
});
