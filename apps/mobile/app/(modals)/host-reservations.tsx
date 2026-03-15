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
    color: "#F57C00",
    bg: "#FFF3E0",
    label: "Pending Approval",
    icon: "hourglass-top",
  },
  CONFIRMED: {
    color: "#1976D2",
    bg: "#E3F2FD",
    label: "Upcoming",
    icon: "event-available",
  },
  ACTIVE: {
    color: "#4CAF50",
    bg: "#E8F5E9",
    label: "Parked",
    icon: "directions-car",
  },
  COMPLETED: {
    color: "#8E8E93",
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
  { key: "CONFIRMED", label: "Upcoming" },
  { key: "ACTIVE", label: "Active" },
  { key: "COMPLETED", label: "Past" },
];

export default function HostReservationsScreen() {
  const [reservations, setReservations] = useState<
    reservationsService.Reservation[]
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

  const renderItem = ({ item }: { item: any }) => {
    const status =
      STATUS_CONFIG[item.status as keyof typeof STATUS_CONFIG] ||
      STATUS_CONFIG.CONFIRMED;

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
            <Text style={styles.slotText}>
              Slot {item.parkingSpace.slotNumber}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Driver Info */}
        <View style={styles.driverRow}>
          <MaterialIcons name="person" size={18} color="#11796F" />
          <Text style={styles.driverName}>{item.driver?.name || "Driver"}</Text>
          {item.driver?.phone && (
            <TouchableOpacity
              style={styles.callBtn}
              onPress={() => {
                /* Linking.openURL(`tel:${item.driver.phone}`) */
              }}
            >
              <MaterialIcons name="phone" size={16} color="#11796F" />
            </TouchableOpacity>
          )}
        </View>

        {/* Vehicle Info */}
        {item.driver?.vehicle && (
          <View style={styles.vehicleRow}>
            <MaterialIcons name="directions-car" size={16} color="#8E8E93" />
            <Text style={styles.vehicleText}>
              {item.driver.vehicle.brand} {item.driver.vehicle.model} •{" "}
              {item.driver.vehicle.plateNumber || "N/A"}
            </Text>
          </View>
        )}

        {/* Time Info */}
        <View style={styles.timeSection}>
          {item.status === "PENDING" && item.arrivalDeadline && (
            <View style={styles.timeItem}>
              <MaterialIcons name="hourglass-empty" size={16} color="#F57C00" />
              <Text style={[styles.timeText, { color: "#F57C00" }]}>
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
              <MaterialIcons name="schedule" size={16} color="#8E8E93" />
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
              <MaterialIcons name="qr-code-scanner" size={24} color="#11796F" />
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
          color="#11796F"
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
              tintColor="#11796F"
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFB" },
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
    backgroundColor: "#11796F",
    borderColor: "#11796F",
  },
  filterText: { fontSize: 13, fontWeight: "600", color: "#8E8E93" },
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
    gap: 8,
    marginBottom: 8,
  },
  driverName: { flex: 1, fontSize: 14, fontWeight: "600", color: "#1A1A2E" },
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
    flex: 1,
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
});
