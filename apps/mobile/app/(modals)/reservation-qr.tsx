import React, { useState, useCallback } from "react";
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

const STATUS_CONFIG = {
  PENDING: { color: "#F57C00", bg: "#FFF3E0", label: "Pending" },
  CONFIRMED: { color: "#1976D2", bg: "#E3F2FD", label: "Confirmed" },
  ACTIVE: { color: "#4CAF50", bg: "#E8F5E9", label: "Active - Parked" },
  COMPLETED: { color: "#8E8E93", bg: "#F5F5F5", label: "Completed" },
  CANCELLED: { color: "#E53935", bg: "#FFEBEE", label: "Cancelled" },
};

export default function ReservationQRScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [reservation, setReservation] =
    useState<reservationsService.Reservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

  const onRefresh = () => {
    setRefreshing(true);
    fetchReservation();
  };

  const handleCancel = () => {
    Alert.alert(
      "Cancel Reservation",
      "Are you sure you want to cancel this reservation? Your payment will be refunded to your wallet.",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            try {
              await reservationsService.cancelReservation(id!);
              Alert.alert(
                "Cancelled",
                "Your reservation has been cancelled and refunded.",
              );
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
        message: `My parking reservation at ${reservation.parkingLocation.title}\nSlot: ${reservation.parkingSpace.slotNumber}\nDate: ${new Date(reservation.startTime).toLocaleDateString()}\nTime: ${new Date(reservation.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - ${new Date(reservation.endTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}\nQR Code: ${reservation.qrCode}`,
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

  const status = STATUS_CONFIG[reservation.status] || STATUS_CONFIG.PENDING;
  const canCancel = ["PENDING", "CONFIRMED"].includes(reservation.status);
  const showQR = ["CONFIRMED", "ACTIVE"].includes(reservation.status);
  const startTime = new Date(reservation.startTime);
  const endTime = new Date(reservation.endTime);

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
            name={reservation.status === "ACTIVE" ? "directions-car" : "info"}
            size={18}
            color={status.color}
          />
          <Text style={[styles.statusText, { color: status.color }]}>
            {status.label}
          </Text>
        </View>

        {/* QR Code */}
        {showQR && reservation.qrCode && (
          <View style={styles.qrCard}>
            <Text style={styles.qrTitle}>Show this QR code to the host</Text>
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
                ? "Present this to check in at the parking location"
                : "Present this to the host when you exit"}
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
                  Slot{" "}
                  {reservation.parkingSpace.name ||
                    reservation.parkingSpace.slotNumber}
                </Text>
              </View>
            </View>
            {reservation.status !== "PENDING" && (
              <TouchableOpacity
                style={styles.directionsBtn}
                onPress={openDirections}
              >
                <MaterialIcons name="navigation" size={22} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Time Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reservation Time</Text>
          <View style={styles.timeCard}>
            <View style={styles.timeRow}>
              <MaterialIcons name="calendar-today" size={20} color="#11796F" />
              <Text style={styles.timeLabel}>Date</Text>
              <Text style={styles.timeValue}>
                {startTime.toLocaleDateString(undefined, {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </Text>
            </View>
            <View style={styles.timeRow}>
              <MaterialIcons name="schedule" size={20} color="#11796F" />
              <Text style={styles.timeLabel}>Start</Text>
              <Text style={styles.timeValue}>
                {startTime.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </View>
            <View style={styles.timeRow}>
              <MaterialIcons name="schedule" size={20} color="#E53935" />
              <Text style={styles.timeLabel}>End</Text>
              <Text style={styles.timeValue}>
                {endTime.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </View>
            {reservation.actualEntryTime && (
              <View style={styles.timeRow}>
                <MaterialIcons name="login" size={20} color="#4CAF50" />
                <Text style={styles.timeLabel}>Checked In</Text>
                <Text style={[styles.timeValue, { color: "#4CAF50" }]}>
                  {new Date(reservation.actualEntryTime).toLocaleTimeString(
                    [],
                    { hour: "2-digit", minute: "2-digit" },
                  )}
                </Text>
              </View>
            )}
            {reservation.actualExitTime && (
              <View style={styles.timeRow}>
                <MaterialIcons name="logout" size={20} color="#1976D2" />
                <Text style={styles.timeLabel}>Checked Out</Text>
                <Text style={[styles.timeValue, { color: "#1976D2" }]}>
                  {new Date(reservation.actualExitTime).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
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
              <Text style={styles.paymentLabel}>Reservation Fee</Text>
              <Text style={styles.paymentValue}>
                ₱{Number(reservation.totalAmount).toFixed(2)}
              </Text>
            </View>
            {reservation.escrowAmount && (
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>In Escrow</Text>
                <Text style={[styles.paymentValue, { color: "#1976D2" }]}>
                  ₱{Number(reservation.escrowAmount).toFixed(2)}
                </Text>
              </View>
            )}
            {reservation.overtimeAmount &&
              Number(reservation.overtimeAmount) > 0 && (
                <View style={styles.paymentRow}>
                  <Text style={styles.paymentLabel}>Overtime Charge</Text>
                  <Text style={[styles.paymentValue, { color: "#E53935" }]}>
                    +₱{Number(reservation.overtimeAmount).toFixed(2)}
                  </Text>
                </View>
              )}
            {reservation.finalAmount && (
              <>
                <View style={styles.divider} />
                <View style={styles.paymentRow}>
                  <Text style={styles.totalLabel}>Total Paid</Text>
                  <Text style={styles.totalValue}>
                    ₱{Number(reservation.finalAmount).toFixed(2)}
                  </Text>
                </View>
              </>
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
});
