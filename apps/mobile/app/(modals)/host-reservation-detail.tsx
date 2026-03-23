import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  TouchableOpacity,
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
    color: "#1976D2",
    bg: "#E3F2FD",
    label: "Confirmed",
    icon: "check-circle",
  },
  ACTIVE: {
    color: "#4CAF50",
    bg: "#E8F5E9",
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

export default function HostReservationDetailScreen() {
  const params = useLocalSearchParams<{ reservation: string }>();
  const [reservation, setReservation] =
    useState<reservationsService.HostReservation | null>(null);

  useEffect(() => {
    if (params.reservation) {
      try {
        setReservation(
          JSON.parse(params.reservation) as reservationsService.HostReservation,
        );
      } catch {
        console.error("Failed to parse reservation data");
      }
    }
  }, [params.reservation]);

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

  const status = STATUS_CONFIG[reservation.status] ?? STATUS_CONFIG.CONFIRMED;
  const driverPlateNumber =
    reservation.driver?.vehicle?.plateNumber || "Not provided";
  const slotName = reservation.parkingSpace.name?.trim() || "Unnamed Spot";
  const bookedSpot = slotName;

  return (
    <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
      <Stack.Screen options={{ title: "Reservation Details" }} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Driver Profile Section */}
        <View style={styles.driverSection}>
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
          <Text style={styles.driverDisplayName}>
            {reservation.driver?.name || "Driver"}
          </Text>
          <Text style={styles.driverPhone}>
            Phone: {reservation.driver?.phone || "Not provided"}
          </Text>
          <Text style={styles.driverPhone}>
            Plate Number: {driverPlateNumber}
          </Text>
          <View style={[styles.statusChip, { backgroundColor: status.bg }]}>
            <MaterialIcons
              name={status.icon as any}
              size={14}
              color={status.color}
            />
            <Text style={[styles.statusChipText, { color: status.color }]}>
              {status.label}
            </Text>
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
                </View>
                {reservation.driver.vehicle.plateNumber && (
                  <View style={styles.plateRow}>
                    <View style={styles.plateBadge}>
                      <Text style={styles.plateText}>
                        {reservation.driver.vehicle.plateNumber}
                      </Text>
                    </View>
                  </View>
                )}
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
            <View style={styles.infoRow}>
              <MaterialIcons name="location-on" size={20} color="#D4501E" />
              <View style={{ flex: 1 }}>
                <Text style={styles.infoTitle}>
                  {reservation.parkingLocation.title}
                </Text>
                <Text style={styles.infoSubtext}>
                  Booked Spot: {bookedSpot}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Session Details */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Session</Text>
          <View style={styles.infoCard}>
            {reservation.status === "PENDING" &&
              reservation.arrivalDeadline && (
                <View style={styles.infoRow}>
                  <MaterialIcons
                    name="hourglass-empty"
                    size={18}
                    color="#D4501E"
                  />
                  <Text style={[styles.infoText, { color: "#D4501E" }]}>
                    Approval deadline{" "}
                    {new Date(reservation.arrivalDeadline).toLocaleTimeString(
                      [],
                      {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true,
                      },
                    )}
                  </Text>
                </View>
              )}
            {reservation.status === "CONFIRMED" &&
              reservation.arrivalDeadline && (
                <View style={styles.infoRow}>
                  <MaterialIcons name="schedule" size={18} color="#A09A94" />
                  <Text style={styles.infoText}>
                    Arrive by{" "}
                    {new Date(reservation.arrivalDeadline).toLocaleTimeString(
                      [],
                      {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true,
                      },
                    )}
                  </Text>
                </View>
              )}
            {reservation.sessionStartedAt && (
              <>
                {reservation.arrivalDeadline && (
                  <View style={styles.timeDivider} />
                )}
                <View style={styles.infoRow}>
                  <MaterialIcons name="login" size={18} color="#4CAF50" />
                  <Text style={[styles.infoText, { color: "#4CAF50" }]}>
                    Checked in{" "}
                    {new Date(reservation.sessionStartedAt).toLocaleTimeString(
                      [],
                      { hour: "2-digit", minute: "2-digit", hour12: true },
                    )}
                  </Text>
                </View>
              </>
            )}
            {reservation.sessionEndedAt && (
              <>
                <View style={styles.timeDivider} />
                <View style={styles.infoRow}>
                  <MaterialIcons name="logout" size={18} color="#1976D2" />
                  <Text style={[styles.infoText, { color: "#1976D2" }]}>
                    Checked out{" "}
                    {new Date(reservation.sessionEndedAt).toLocaleTimeString(
                      [],
                      { hour: "2-digit", minute: "2-digit", hour12: true },
                    )}
                  </Text>
                </View>
              </>
            )}
            {reservation.status === "ACTIVE" && !reservation.sessionEndedAt && (
              <>
                {reservation.sessionStartedAt && (
                  <View style={styles.timeDivider} />
                )}
                <View style={styles.infoRow}>
                  <MaterialIcons name="timer" size={18} color="#4CAF50" />
                  <Text style={[styles.infoText, { color: "#4CAF50" }]}>
                    Session in progress — Pay-as-you-go
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Amount */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Payment</Text>
          <View style={styles.infoCard}>
            <View style={styles.amountMainRow}>
              <Text style={styles.amountLabel}>Total Amount</Text>
              <Text style={styles.amountValue}>
                ₱
                {Number(
                  reservation.finalAmount || reservation.totalAmount,
                ).toFixed(2)}
              </Text>
            </View>
            {reservation.overtimeAmount &&
              Number(reservation.overtimeAmount) > 0 && (
                <Text style={styles.overtimeText}>
                  Includes ₱{Number(reservation.overtimeAmount).toFixed(2)}{" "}
                  overtime
                </Text>
              )}
          </View>
        </View>

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
    padding: 20,
    paddingBottom: 40,
  },

  // Driver Profile
  driverSection: {
    alignItems: "center",
    paddingVertical: 24,
    marginBottom: 8,
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
    marginBottom: 4,
  },
  driverPhone: {
    fontSize: 14,
    color: "#A09A94",
    marginBottom: 2,
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

  // Section
  section: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#A09A94",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
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
    fontSize: 14,
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
});
