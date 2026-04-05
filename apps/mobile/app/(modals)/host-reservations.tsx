import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, router, useFocusEffect } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import * as reservationsService from "../../src/services/reservations";

const STATUS_CONFIG = {
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
    icon: "check-circle",
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

const FILTERS = [
  { key: "all", label: "All" },
  { key: "Upcoming", label: "Upcoming" },
  { key: "Active", label: "Active" },
  { key: "Past", label: "Past" },
];

export default function HostReservationsScreen() {
  const [reservations, setReservations] = useState<
    reservationsService.HostReservation[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("all");

  const fetchReservations = useCallback(async () => {
    try {
      const status = filter === "all" ? undefined : filter;
      const data = await reservationsService.getHostReservations(
        undefined,
        status,
      );
      setReservations(data);
    } catch (err) {
      console.error("Failed to fetch reservations:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useFocusEffect(
    useCallback(() => {
      fetchReservations();
    }, [fetchReservations]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchReservations();
  };

  const renderItem = ({
    item,
  }: {
    item: reservationsService.HostReservation;
  }) => {
    const status =
      STATUS_CONFIG[item.status as keyof typeof STATUS_CONFIG] ||
      STATUS_CONFIG.CONFIRMED;
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
      <View style={styles.card}>
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
          <MaterialIcons name="person" size={18} color="#D4501E" />
          <Text style={styles.driverName}>{item.driver?.name || "Driver"}</Text>
        </View>

        <View style={styles.driverDetails}>
          <View style={styles.detailRow}>
            <MaterialIcons name="phone" size={14} color="#A09A94" />
            <Text style={styles.detailText} numberOfLines={1}>Phone: {driverPhone}</Text>
          </View>
          <View style={styles.detailRow}>
            <MaterialIcons
              name="confirmation-number"
              size={14}
              color="#A09A94"
            />
            <Text style={styles.detailText} numberOfLines={1}>
              Plate Number: {driverPlateNumber}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <MaterialIcons name="directions-car" size={14} color="#A09A94" />
            <Text style={styles.detailText} numberOfLines={1}>Vehicle: {vehicleText}</Text>
          </View>
          <View style={styles.detailRow}>
            <MaterialIcons name="local-parking" size={14} color="#A09A94" />
            <Text style={styles.detailText} numberOfLines={1}>Booked Spot: {bookedSpot}</Text>
          </View>
        </View>

        {/* Time Info */}
        <View style={styles.timeSection}>
          {item.status === "PENDING" && item.arrivalDeadline && (
            <View style={styles.timeItem}>
              <MaterialIcons name="hourglass-empty" size={16} color="#D4501E" />
              <Text style={[styles.timeText, { color: "#D4501E" }]}>
                Decision by{" "}
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
              <MaterialIcons name="schedule" size={16} color="#A09A94" />
              <Text style={styles.timeText}>
                Arrive by{" "}
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

        {item.status === "COMPLETED" && (
          <TouchableOpacity
            style={styles.reviewBtn}
            onPress={() =>
              router.push({
                pathname: "/(modals)/leave-review",
                params: {
                  reservationId: item.id,
                  locationTitle: item.driver?.name || "Driver",
                  reviewType: "host",
                },
              })
            }
            activeOpacity={0.7}
          >
            <MaterialIcons name="star" size={16} color="#FFB300" />
            <Text style={styles.reviewBtnText}>Rate Driver</Text>
          </TouchableOpacity>
        )}
      </View>
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

  return (
    <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
      <Stack.Screen
        options={{
          title: "Reservations",
          headerRight: () => (
            <TouchableOpacity
              style={styles.scanHeaderBtn}
              onPress={() => router.push("/(modals)/scan-qr")}
            >
              <MaterialIcons name="qr-code-scanner" size={24} color="#D4501E" />
            </TouchableOpacity>
          ),
        }}
      />

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

      {loading ? (
        <ActivityIndicator
          size="large"
          color="#D4501E"
          style={{ marginTop: 40 }}
        />
      ) : (
        <FlatList
          data={reservations}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#D4501E"
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  scanHeaderBtn: { marginRight: 8 },

  // Filters
  filters: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
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
    backgroundColor: "#D4501E",
    borderColor: "#D4501E",
  },
  filterText: { fontSize: 13, fontWeight: "600", color: "#A09A94" },
  filterTextActive: { color: "#fff" },

  // List
  list: { padding: 16, paddingTop: 0 },

  // Card
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
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
  cardLocation: { fontSize: 15, fontWeight: "700", color: "#232230" },
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
    backgroundColor: "#F5F4F2",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  slotText: { fontSize: 12, fontWeight: "700", color: "#D4501E" },
  divider: { height: 1, backgroundColor: "#F0F0F0", marginBottom: 12 },

  // Driver
  driverRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  driverName: { flex: 1, fontSize: 14, fontWeight: "600", color: "#232230" },
  driverDetails: {
    gap: 4,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  detailText: {
    flex: 1,
    fontSize: 12,
    color: "#A09A94",
  },
  callBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F5F4F2",
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
  vehicleText: { fontSize: 13, color: "#A09A94" },

  // Time
  timeSection: { gap: 6, marginBottom: 12 },
  timeItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  timeText: { fontSize: 13, color: "#A09A94" },

  // Amount
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  amountLabel: { fontSize: 14, color: "#A09A94" },
  amountValue: { fontSize: 16, fontWeight: "700", color: "#D4501E" },
  overtimeText: { fontSize: 12, color: "#E53935" },

  // Empty State
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    paddingTop: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#232230",
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: "#A09A94",
    textAlign: "center",
    marginTop: 8,
  },
  reviewBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#FFF8E1",
    paddingVertical: 10,
    borderRadius: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#FFE0B2",
  },
  reviewBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFB300",
  },
});
