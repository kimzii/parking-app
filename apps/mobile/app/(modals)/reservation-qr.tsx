import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Share,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Stack,
  useLocalSearchParams,
  router,
  useFocusEffect,
} from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import QRCode from "react-native-qrcode-svg";
import * as reservationsService from "../../src/services/reservations";

const STATUS_CONFIG: Record<
  string,
  { color: string; bg: string; label: string }
> = {
  PENDING: { color: "#F57C00", bg: "#FFF3E0", label: "Awaiting Approval" },
  CONFIRMED: { color: "#1976D2", bg: "#E3F2FD", label: "Awaiting Arrival" },
  ACTIVE: { color: "#4CAF50", bg: "#E8F5E9", label: "Session Active" },
  COMPLETED: { color: "#8E8E93", bg: "#F5F5F5", label: "Completed" },
  CANCELLED: { color: "#E53935", bg: "#FFEBEE", label: "Cancelled" },
  EXPIRED: { color: "#F57C00", bg: "#FFF3E0", label: "Expired" },
};

function formatCountdown(ms: number): string {
  if (ms <= 0) return "Expired";
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  return `${mins}m ${secs.toString().padStart(2, "0")}s`;
}

function formatDuration(ms: number): string {
  const totalMins = Math.floor(ms / 60000);
  const hrs = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  if (hrs === 0) return `${mins}m`;
  return `${hrs}h ${mins}m`;
}

export default function ReservationQRScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [reservation, setReservation] =
    useState<reservationsService.Reservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(new Date());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reservationStatus = reservation?.status;

  const fetchReservation = useCallback(async () => {
    if (!id) return;
    try {
      const data = await reservationsService.getReservation(id);
      setReservation(data);
    } catch (err) {
      console.error("Failed to fetch reservation:", err);
      Alert.alert("Error", "Failed to load reservation details");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      fetchReservation();
    }, [fetchReservation]),
  );

  useEffect(() => {
    if (
      reservationStatus !== "PENDING" &&
      reservationStatus !== "CONFIRMED" &&
      reservationStatus !== "ACTIVE"
    ) {
      return;
    }

    const interval = setInterval(() => {
      void fetchReservation();
    }, 15 * 1000);

    return () => clearInterval(interval);
  }, [reservationStatus, fetchReservation]);

  // Live timer for countdown / session duration
  useEffect(() => {
    if (
      reservationStatus === "PENDING" ||
      reservationStatus === "CONFIRMED" ||
      reservationStatus === "ACTIVE"
    ) {
      timerRef.current = setInterval(() => setNow(new Date()), 1000);
      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [reservationStatus]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchReservation();
  };

  const handleCancel = () => {
    if (!reservation) return;

    const shouldRefund = reservation.status === "PENDING";

    Alert.alert(
      "Cancel Reservation",
      shouldRefund
        ? "Are you sure you want to cancel? Your first hour payment will be refunded."
        : "Are you sure you want to cancel? No refund will be issued once host approval is given.",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            try {
              const result = await reservationsService.cancelReservation(id!);
              Alert.alert("Cancelled", result.message);
              fetchReservation();
            } catch (err: any) {
              Alert.alert(
                "Error",
                err.response?.data?.message || "Failed to cancel reservation",
              );
            }
          },
        },
      ],
    );
  };

  const handleShare = async () => {
    if (!reservation) return;
    try {
      await Share.share({
        message: `My parking reservation at ${reservation.parkingLocation.title}\nSlot: ${reservation.parkingSpace.name || reservation.parkingSpace.slotNumber}\nQR Code: ${reservation.qrCode}`,
      });
    } catch (err) {
      console.error("Failed to share:", err);
    }
  };

  const openDirections = () => {
    if (!reservation) return;
    router.push({
      pathname: "/(modals)/navigate-to-spot",
      params: {
        lat: String(reservation.parkingLocation.latitude),
        lng: String(reservation.parkingLocation.longitude),
        title: reservation.parkingLocation.title,
        address: reservation.parkingLocation.address,
      },
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        <Stack.Screen options={{ title: "Reservation" }} />
        <ActivityIndicator
          size="large"
          color="#11796F"
          style={{ marginTop: 60 }}
        />
      </SafeAreaView>
    );
  }

  if (!reservation) {
    return (
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        <Stack.Screen options={{ title: "Reservation" }} />
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={48} color="#E53935" />
          <Text style={styles.errorText}>Reservation not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const status = STATUS_CONFIG[reservation.status] || STATUS_CONFIG.CANCELLED;
  const canCancel = ["PENDING", "CONFIRMED"].includes(reservation.status);
  const showQR = ["CONFIRMED", "ACTIVE"].includes(reservation.status);

  // Arrival countdown
  const arrivalDeadline = new Date(reservation.arrivalDeadline);
  const arrivalRemaining = arrivalDeadline.getTime() - now.getTime();

  // Session duration
  const sessionStart = reservation.sessionStartedAt
    ? new Date(reservation.sessionStartedAt)
    : null;
  const sessionEnd = reservation.sessionEndedAt
    ? new Date(reservation.sessionEndedAt)
    : null;
  const sessionDuration = sessionStart
    ? (sessionEnd || now).getTime() - sessionStart.getTime()
    : 0;

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <Stack.Screen
        options={{
          title: "Reservation",
          headerRight: () => (
            <TouchableOpacity onPress={handleShare} style={{ marginRight: 8 }}>
              <MaterialIcons name="share" size={24} color="#11796F" />
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#11796F"
          />
        }
      >
        {/* Status Badge */}
        <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
          <MaterialIcons
            name={
              reservation.status === "ACTIVE"
                ? "directions-car"
                : reservation.status === "PENDING"
                  ? "hourglass-top"
                  : reservation.status === "CONFIRMED"
                    ? "hourglass-top"
                    : "info"
            }
            size={18}
            color={status.color}
          />
          <Text style={[styles.statusText, { color: status.color }]}>
            {status.label}
          </Text>
        </View>

        {/* Countdown (PENDING / CONFIRMED) */}
        {(reservation.status === "PENDING" ||
          reservation.status === "CONFIRMED") && (
          <View
            style={[
              styles.countdownCard,
              arrivalRemaining <= 10 * 60 * 1000 &&
                arrivalRemaining > 0 &&
                styles.countdownCardWarning,
              arrivalRemaining <= 0 && styles.countdownCardExpired,
            ]}
          >
            <MaterialIcons
              name="timer"
              size={28}
              color={arrivalRemaining <= 0 ? "#E53935" : "#F57C00"}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.countdownLabel}>
                {reservation.status === "PENDING"
                  ? "Host Approval Window"
                  : "Arrival Window"}
              </Text>
              <Text
                style={[
                  styles.countdownValue,
                  arrivalRemaining <= 0 && { color: "#E53935" },
                ]}
              >
                {formatCountdown(arrivalRemaining)}
              </Text>
            </View>
            <Text style={styles.countdownHint}>
              {reservation.status === "PENDING"
                ? "Host decision by "
                : "Arrive by "}
              {arrivalDeadline.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              })}
            </Text>
          </View>
        )}

        {/* Session Timer (ACTIVE) */}
        {reservation.status === "ACTIVE" && sessionStart && (
          <View style={styles.sessionCard}>
            <MaterialIcons name="timer" size={28} color="#4CAF50" />
            <View style={{ flex: 1 }}>
              <Text style={styles.sessionLabel}>Session Duration</Text>
              <Text style={styles.sessionValue}>
                {formatDuration(sessionDuration)}
              </Text>
            </View>
            <Text style={styles.sessionStartText}>
              Started{" "}
              {sessionStart.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              })}
            </Text>
          </View>
        )}

        {/* QR Code */}
        {showQR && reservation.qrCode && (
          <View style={styles.qrCard}>
            <Text style={styles.qrTitle}>Show this QR code to the valet</Text>
            <View style={styles.qrContainer}>
              <QRCode
                value={reservation.qrCode}
                size={200}
                color="#1A1A2E"
                backgroundColor="#fff"
              />
            </View>
            <Text style={styles.qrCodeText}>{reservation.qrCode}</Text>
            <Text style={styles.qrHint}>
              {reservation.status === "CONFIRMED"
                ? "Present this when you arrive to start your session"
                : "Present this when you leave to end your session"}
            </Text>
          </View>
        )}

        {/* Location Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Parking Location</Text>
          <View style={styles.locationCard}>
            <View style={styles.locationInfo}>
              <Text style={styles.locationTitle}>
                {reservation.parkingLocation.title}
              </Text>
              <Text style={styles.locationAddress}>
                {reservation.parkingLocation.address}
              </Text>
              <View style={styles.slotBadge}>
                <MaterialIcons name="event-seat" size={14} color="#11796F" />
                <Text style={styles.slotText}>
                  {reservation.parkingSpace.name ||
                    `Slot ${reservation.parkingSpace.slotNumber}`}
                </Text>
              </View>
            </View>
            {["CONFIRMED", "ACTIVE"].includes(reservation.status) && (
              <TouchableOpacity
                style={styles.directionsBtn}
                onPress={openDirections}
              >
                <MaterialIcons name="navigation" size={22} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Session Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Session Details</Text>
          <View style={styles.timeCard}>
            <View style={styles.timeRow}>
              <MaterialIcons name="calendar-today" size={20} color="#11796F" />
              <Text style={styles.timeLabel}>Booked</Text>
              <Text style={styles.timeValue}>
                {new Date(
                  reservation.createdAt || reservation.arrivalDeadline,
                ).toLocaleDateString(undefined, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
              </Text>
            </View>
            {sessionStart && (
              <View style={styles.timeRow}>
                <MaterialIcons name="login" size={20} color="#4CAF50" />
                <Text style={styles.timeLabel}>Checked In</Text>
                <Text style={[styles.timeValue, { color: "#4CAF50" }]}>
                  {sessionStart.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                  })}
                </Text>
              </View>
            )}
            {sessionEnd && (
              <View style={styles.timeRow}>
                <MaterialIcons name="logout" size={20} color="#1976D2" />
                <Text style={styles.timeLabel}>Checked Out</Text>
                <Text style={[styles.timeValue, { color: "#1976D2" }]}>
                  {sessionEnd.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                  })}
                </Text>
              </View>
            )}
            {sessionStart && (
              <View style={styles.timeRow}>
                <MaterialIcons name="timelapse" size={20} color="#11796F" />
                <Text style={styles.timeLabel}>Duration</Text>
                <Text style={styles.timeValue}>
                  {formatDuration(sessionDuration)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Payment Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment</Text>
          <View style={styles.paymentCard}>
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>First Hour (upfront)</Text>
              <Text style={styles.paymentValue}>
                ₱{Number(reservation.totalAmount).toFixed(2)}
              </Text>
            </View>
            {reservation.status === "ACTIVE" &&
              reservation.parkingLocation.basePricePerHour && (
                <View style={styles.paymentRow}>
                  <Text style={styles.paymentLabel}>Rate</Text>
                  <Text style={styles.paymentValue}>
                    ₱
                    {Number(
                      reservation.parkingLocation.basePricePerHour,
                    ).toFixed(2)}
                    /hr
                  </Text>
                </View>
              )}
            {reservation.finalAmount && Number(reservation.finalAmount) > 0 && (
              <>
                <View style={styles.divider} />
                <View style={styles.paymentRow}>
                  <Text style={styles.totalLabel}>Total Charged</Text>
                  <Text style={styles.totalValue}>
                    ₱{Number(reservation.finalAmount).toFixed(2)}
                  </Text>
                </View>
              </>
            )}
            {reservation.status === "ACTIVE" && (
              <Text style={styles.paymentNote}>
                Additional charges apply based on session duration
              </Text>
            )}
          </View>
        </View>

        {/* Cancel Button */}
        {canCancel && (
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={handleCancel}
            activeOpacity={0.8}
          >
            <MaterialIcons name="cancel" size={20} color="#E53935" />
            <Text style={styles.cancelBtnText}>Cancel Reservation</Text>
          </TouchableOpacity>
        )}

        {/* Completed Message */}
        {reservation.status === "COMPLETED" && (
          <View style={styles.completedCard}>
            <MaterialIcons name="check-circle" size={32} color="#4CAF50" />
            <Text style={styles.completedTitle}>Parking Session Complete</Text>
            <Text style={styles.completedText}>
              Thank you for using ParkLink!
            </Text>
          </View>
        )}

        {/* Expired Message */}
        {reservation.status === "EXPIRED" && (
          <View style={styles.expiredCard}>
            <MaterialIcons name="timer-off" size={32} color="#F57C00" />
            <Text style={styles.expiredTitle}>Reservation Expired</Text>
            <Text style={styles.expiredText}>
              You did not arrive within the 60-minute window.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFB" },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  errorText: { fontSize: 16, color: "#1A1A2E", fontWeight: "600" },

  // Status Badge
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    marginBottom: 20,
  },
  statusText: { fontSize: 14, fontWeight: "700" },

  // Countdown Card (arrival window)
  countdownCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF3E0",
    borderRadius: 14,
    padding: 16,
    gap: 12,
    marginBottom: 20,
  },
  countdownCardWarning: { backgroundColor: "#FFEBEE" },
  countdownCardExpired: { backgroundColor: "#FFCDD2" },
  countdownLabel: { fontSize: 12, color: "#666", fontWeight: "600" },
  countdownValue: { fontSize: 22, fontWeight: "800", color: "#F57C00" },
  countdownHint: { fontSize: 11, color: "#8E8E93" },

  // Session Timer Card
  sessionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    borderRadius: 14,
    padding: 16,
    gap: 12,
    marginBottom: 20,
  },
  sessionLabel: { fontSize: 12, color: "#666", fontWeight: "600" },
  sessionValue: { fontSize: 22, fontWeight: "800", color: "#4CAF50" },
  sessionStartText: { fontSize: 11, color: "#8E8E93" },

  // QR Card
  qrCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  qrTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A2E",
    marginBottom: 20,
  },
  qrContainer: {
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#11796F",
  },
  qrCodeText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: "800",
    color: "#11796F",
    letterSpacing: 2,
  },
  qrHint: {
    marginTop: 12,
    fontSize: 13,
    color: "#8E8E93",
    textAlign: "center",
  },

  // Section
  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1A1A2E",
    marginBottom: 10,
  },

  // Location Card
  locationCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  locationInfo: { flex: 1, gap: 4 },
  locationTitle: { fontSize: 16, fontWeight: "700", color: "#1A1A2E" },
  locationAddress: { fontSize: 13, color: "#8E8E93" },
  slotBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#E8F5E9",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 6,
  },
  slotText: { fontSize: 12, fontWeight: "700", color: "#11796F" },
  directionsBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#11796F",
    justifyContent: "center",
    alignItems: "center",
  },

  // Time Card
  timeCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  timeRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  timeLabel: { flex: 1, fontSize: 14, color: "#8E8E93", fontWeight: "600" },
  timeValue: { fontSize: 14, fontWeight: "700", color: "#1A1A2E" },

  // Payment Card
  paymentCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  paymentRow: { flexDirection: "row", justifyContent: "space-between" },
  paymentLabel: { fontSize: 14, color: "#8E8E93" },
  paymentValue: { fontSize: 14, fontWeight: "600", color: "#1A1A2E" },
  paymentNote: {
    fontSize: 12,
    color: "#8E8E93",
    fontStyle: "italic",
    marginTop: 4,
  },
  divider: { height: 1, backgroundColor: "#E0E0E0", marginVertical: 6 },
  totalLabel: { fontSize: 16, fontWeight: "700", color: "#1A1A2E" },
  totalValue: { fontSize: 18, fontWeight: "800", color: "#11796F" },

  // Cancel Button
  cancelBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FFEBEE",
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 10,
  },
  cancelBtnText: { fontSize: 15, fontWeight: "700", color: "#E53935" },

  // Completed Card
  completedCard: {
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    borderRadius: 14,
    padding: 24,
    gap: 8,
    marginTop: 10,
  },
  completedTitle: { fontSize: 17, fontWeight: "700", color: "#4CAF50" },
  completedText: { fontSize: 14, color: "#666" },

  // Expired Card
  expiredCard: {
    alignItems: "center",
    backgroundColor: "#FFF3E0",
    borderRadius: 14,
    padding: 24,
    gap: 8,
    marginTop: 10,
  },
  expiredTitle: { fontSize: 17, fontWeight: "700", color: "#F57C00" },
  expiredText: { fontSize: 14, color: "#666", textAlign: "center" },
});
