import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Image,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { userService } from "../../src/services/user";
import * as reservationsService from "../../src/services/reservations";

const STATUS_CONFIG: Record<
  string,
  { color: string; bg: string; label: string; icon: string }
> = {
  PENDING: {
    color: "#F57C00",
    bg: "#FFF3E0",
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
    color: "#8E8E93",
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

function formatCountdown(ms: number): string {
  if (ms <= 0) return "Expired";
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  return `${mins}m ${secs.toString().padStart(2, "0")}s`;
}

const FILTERS = [
  { key: "all", label: "All" },
  { key: "Upcoming", label: "Upcoming" },
  { key: "Active", label: "Active" },
  { key: "Past", label: "Past" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

export default function HostHomeScreen() {
  const [userName, setUserName] = useState("");
  const [loading, setLoading] = useState(true);
  const [reservations, setReservations] = useState<
    reservationsService.HostReservation[]
  >([]);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchReservations = useCallback(async (status?: string) => {
    try {
      const mapped = status === "all" || !status ? undefined : status;
      const data = await reservationsService.getHostReservations(
        undefined,
        mapped,
      );
      setReservations(data);
    } catch (err) {
      console.error("Failed to fetch reservations:", err);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      const fetchData = async () => {
        setLoading(true);
        try {
          const profile = await userService.getProfile();
          setUserName(
            `${profile.firstName ?? ""} ${profile.lastName ?? ""}`.trim() ||
              "Host",
          );
          await fetchReservations(filter);
        } catch (err) {
          console.error("Failed to fetch host data:", err);
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }, [filter, fetchReservations]),
  );

  useFocusEffect(
    useCallback(() => {
      const interval = setInterval(() => {
        void fetchReservations(filter);
      }, 15 * 1000);

      return () => clearInterval(interval);
    }, [filter, fetchReservations]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchReservations(filter);
    setRefreshing(false);
  }, [filter, fetchReservations]);

  const handleApprove = useCallback(
    (id: string) => {
      Alert.alert("Approve Booking", "Approve this booking request?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Approve",
          onPress: async () => {
            try {
              await reservationsService.approveReservation(id);
              await fetchReservations(filter);
            } catch (err: any) {
              Alert.alert(
                "Approval Failed",
                err.response?.data?.message || "Failed to approve reservation",
              );
            }
          },
        },
      ]);
    },
    [filter, fetchReservations],
  );

  const handleReject = useCallback(
    (id: string) => {
      Alert.alert(
        "Reject Booking",
        "Reject this booking request? The driver will be refunded.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Reject",
            style: "destructive",
            onPress: async () => {
              try {
                await reservationsService.rejectReservation(id);
                await fetchReservations(filter);
              } catch (err: any) {
                Alert.alert(
                  "Rejection Failed",
                  err.response?.data?.message || "Failed to reject reservation",
                );
              }
            },
          },
        ],
      );
    },
    [filter, fetchReservations],
  );

  const renderReservationItem = ({
    item,
  }: {
    item: reservationsService.HostReservation;
  }) => {
    const status = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.CONFIRMED;
    const pendingRemainingMs =
      item.status === "PENDING" && item.arrivalDeadline
        ? new Date(item.arrivalDeadline).getTime() - now.getTime()
        : null;
    const driverPhone = item.driver?.phone || "Not provided";
    const driverPlateNumber =
      item.driver?.vehicle?.plateNumber || "Not provided";
    const slotName = item.parkingSpace.name?.trim() || "Unnamed Spot";
    const bookedSpot = slotName;
    const vehicleLabel = [
      item.driver?.vehicle?.brand,
      item.driver?.vehicle?.model,
    ]
      .filter(Boolean)
      .join(" ")
      .trim();
    const vehicleText = item.driver?.vehicle
      ? vehicleLabel || item.driver.vehicle.vehicleType || "Vehicle"
      : "Not provided";

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() =>
          router.push({
            pathname: "/(modals)/host-reservation-detail",
            params: { reservation: JSON.stringify(item) },
          } as any)
        }
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <Text style={styles.cardLocation}>
              {item.parkingLocation.title}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
              <MaterialIcons
                name={status.icon as any}
                size={12}
                color={status.color}
              />
              <Text style={[styles.statusText, { color: status.color }]}>
                {status.label}
              </Text>
            </View>
          </View>
          <View style={styles.slotBadge}>
            <Text style={styles.slotText}>{slotName}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Driver Info */}
        <View style={styles.driverRow}>
          {item.driver?.image ? (
            <Image
              source={{ uri: item.driver.image }}
              style={styles.driverAvatar}
            />
          ) : (
            <View style={styles.driverAvatarPlaceholder}>
              <MaterialIcons name="person" size={18} color="#C7C7CC" />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.driverName}>
              {item.driver?.name || "Driver"}
            </Text>
            <View style={styles.driverMetaRow}>
              <MaterialIcons name="phone" size={12} color="#8E8E93" />
              <Text style={styles.driverMetaText}>Phone: {driverPhone}</Text>
            </View>
            <View style={styles.driverMetaRow}>
              <MaterialIcons
                name="confirmation-number"
                size={12}
                color="#8E8E93"
              />
              <Text style={styles.driverMetaText}>
                Plate Number: {driverPlateNumber}
              </Text>
            </View>
            <View style={styles.driverMetaRow}>
              <MaterialIcons name="directions-car" size={12} color="#8E8E93" />
              <Text style={styles.driverMetaText}>Vehicle: {vehicleText}</Text>
            </View>
            <View style={styles.driverMetaRow}>
              <MaterialIcons name="local-parking" size={12} color="#8E8E93" />
              <Text style={styles.driverMetaText}>
                Booked Spot: {bookedSpot}
              </Text>
            </View>
          </View>
          <MaterialIcons name="chevron-right" size={22} color="#C7C7CC" />
        </View>

        {/* Time Info */}
        <View style={styles.timeSection}>
          {item.status === "PENDING" && item.arrivalDeadline && (
            <View style={styles.timeItem}>
              <MaterialIcons name="schedule" size={16} color="#8E8E93" />
              <Text style={styles.timeText}>
                Approve in {formatCountdown(pendingRemainingMs ?? 0)}
              </Text>
            </View>
          )}
          {item.status === "PENDING" && item.arrivalDeadline && (
            <View style={styles.timeItem}>
              <MaterialIcons name="hourglass-empty" size={16} color="#F57C00" />
              <Text style={[styles.timeText, { color: "#F57C00" }]}>
                Decision deadline{" "}
                {new Date(item.arrivalDeadline).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                })}
              </Text>
            </View>
          )}
          {item.status === "CONFIRMED" && item.arrivalDeadline && (
            <View style={styles.timeItem}>
              <MaterialIcons name="schedule" size={16} color="#8E8E93" />
              <Text style={styles.timeText}>
                Driver arrives by{" "}
                {new Date(item.arrivalDeadline).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                })}
              </Text>
            </View>
          )}
          {item.sessionStartedAt && (
            <View style={styles.timeItem}>
              <MaterialIcons name="login" size={16} color="#4CAF50" />
              <Text style={[styles.timeText, { color: "#4CAF50" }]}>
                Checked in:{" "}
                {new Date(item.sessionStartedAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                })}
              </Text>
            </View>
          )}
          {item.sessionEndedAt && (
            <View style={styles.timeItem}>
              <MaterialIcons name="logout" size={16} color="#1976D2" />
              <Text style={[styles.timeText, { color: "#1976D2" }]}>
                Checked out:{" "}
                {new Date(item.sessionEndedAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                })}
              </Text>
            </View>
          )}
          {item.status === "ACTIVE" && !item.sessionEndedAt && (
            <View style={styles.timeItem}>
              <MaterialIcons name="timer" size={16} color="#4CAF50" />
              <Text style={[styles.timeText, { color: "#4CAF50" }]}>
                Session in progress — Pay-as-you-go
              </Text>
            </View>
          )}
        </View>

        {/* Amount */}
        <View style={styles.amountRow}>
          <Text style={styles.amountLabel}>Amount</Text>
          <Text style={styles.amountValue}>
            ₱{Number(item.finalAmount || item.totalAmount).toFixed(2)}
          </Text>
          {item.overtimeAmount && Number(item.overtimeAmount) > 0 && (
            <Text style={styles.overtimeText}>
              (+₱{Number(item.overtimeAmount).toFixed(2)} overtime)
            </Text>
          )}
        </View>

        {item.status === "PENDING" && (pendingRemainingMs ?? 0) > 0 && (
          <View style={styles.actionBtns}>
            <TouchableOpacity
              style={styles.rejectBtn}
              onPress={() => handleReject(item.id)}
              activeOpacity={0.8}
            >
              <MaterialIcons name="close" size={18} color="#E53935" />
              <Text style={styles.rejectBtnText}>Reject</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={() => handleApprove(item.id)}
              activeOpacity={0.8}
            >
              <MaterialIcons name="check" size={18} color="#fff" />
              <Text style={styles.confirmBtnText}>Approve</Text>
            </TouchableOpacity>
          </View>
        )}
        {item.status === "PENDING" && (pendingRemainingMs ?? 0) <= 0 && (
          <Text style={styles.overtimeText}>
            Approval window expired. Pull to refresh.
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialIcons name="event-note" size={64} color="#C7C7CC" />
      <Text style={styles.emptyTitle}>No reservations</Text>
      <Text style={styles.emptyText}>
        Reservations for your parking spaces will appear here
      </Text>
    </View>
  );

  const renderHeader = () => (
    <>
      {/* Scan QR Button */}
      <TouchableOpacity
        style={styles.scanBtn}
        onPress={() => router.push("/(modals)/scan-qr")}
        activeOpacity={0.8}
      >
        <MaterialIcons name="qr-code-scanner" size={28} color="#fff" />
        <Text style={styles.scanBtnText}>Scan QR</Text>
      </TouchableOpacity>

      {/* Reservations Section Title */}
      <Text style={styles.sectionTitle}>Reservations</Text>

      {/* Filters */}
      <View style={styles.filters}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[
              styles.filterBtn,
              filter === f.key && styles.filterBtnActive,
            ]}
            onPress={() => {
              setFilter(f.key);
              setLoading(true);
            }}
          >
            <Text
              style={[
                styles.filterText,
                filter === f.key && styles.filterTextActive,
              ]}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.userName}>{userName}</Text>
        </View>
        <View style={styles.hostBadge}>
          <MaterialIcons name="home-work" size={16} color="#11796F" />
          <Text style={styles.hostBadgeText}>Host</Text>
        </View>
      </View>

      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator
            size="large"
            color="#11796F"
            style={{ marginTop: 40 }}
          />
        ) : (
          <FlatList
            data={reservations}
            keyExtractor={(item) => item.id}
            renderItem={renderReservationItem}
            ListHeaderComponent={renderHeader}
            ListEmptyComponent={renderEmptyState}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#11796F"
              />
            }
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8FAFB" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 16,
  },
  greeting: {
    fontSize: 15,
    color: "#8E8E93",
    fontWeight: "500",
  },
  userName: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1A1A2E",
    letterSpacing: -0.3,
  },
  hostBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#E8F5F3",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  hostBadgeText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#11796F",
  },
  content: {
    flex: 1,
    backgroundColor: "#F8FAFB",
  },
  listContent: {
    padding: 20,
    paddingBottom: 40,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#8E8E93",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginLeft: 4,
    marginTop: 8,
  },

  // Scan QR
  scanBtn: {
    backgroundColor: "#11796F",
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    shadowColor: "#11796F",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    flexDirection: "row",
  },
  scanBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  scanBtnHint: {
    fontSize: 11,
    fontWeight: "500",
    color: "rgba(255,255,255,0.7)",
  },

  // Filters
  filters: {
    flexDirection: "row",
    gap: 8,
  },
  filterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  filterBtnActive: {
    backgroundColor: "#11796F",
    borderColor: "#11796F",
  },
  filterText: { fontSize: 13, fontWeight: "600", color: "#8E8E93" },
  filterTextActive: { color: "#fff" },

  // Card
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  cardHeaderLeft: { flex: 1, gap: 6 },
  cardLocation: { fontSize: 15, fontWeight: "700", color: "#1A1A2E" },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  statusText: { fontSize: 11, fontWeight: "600" },
  slotBadge: {
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  slotText: { fontSize: 12, fontWeight: "700", color: "#11796F" },
  divider: { height: 1, backgroundColor: "#F0F0F0", marginBottom: 12 },

  // Driver
  driverRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  driverAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "#E8F5F3",
  },
  driverAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#E8F5F3",
  },
  driverName: { fontSize: 14, fontWeight: "600", color: "#1A1A2E" },
  driverMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  driverMetaText: { flex: 1, fontSize: 12, color: "#8E8E93" },
  vehicleInline: { fontSize: 12, color: "#8E8E93", marginTop: 2 },
  callBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
  },

  // Vehicle
  vehicleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  vehicleText: { fontSize: 13, color: "#8E8E93" },

  // Time
  timeSection: { gap: 6, marginBottom: 12 },
  timeItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  timeText: { fontSize: 13, color: "#666" },

  // Amount
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  amountLabel: { fontSize: 14, color: "#8E8E93" },
  amountValue: { fontSize: 16, fontWeight: "700", color: "#11796F" },
  overtimeText: { fontSize: 12, color: "#E53935" },

  // Empty State
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    paddingTop: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A2E",
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: "#8E8E93",
    textAlign: "center",
    marginTop: 8,
  },

  // Accept / Reject buttons
  actionBtns: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  rejectBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#FFEBEE",
  },
  rejectBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#E53935",
  },
  confirmBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#11796F",
  },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
  },
});
