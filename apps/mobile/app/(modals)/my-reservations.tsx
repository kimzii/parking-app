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
import { Image } from "expo-image";
import * as reservationsService from "../../src/services/reservations";

const STATUS_CONFIG = {
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
    icon: "event-available",
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
  { key: "ACTIVE", label: "Active" },
  { key: "Past", label: "Past" },
];

export default function MyReservationsScreen() {
  const [reservations, setReservations] = useState<
    reservationsService.Reservation[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("all");

  const fetchReservations = useCallback(async () => {
    try {
      const status = filter === "all" ? undefined : filter;
      const data = await reservationsService.getMyReservations(status);
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

  const renderItem = ({ item }: { item: reservationsService.Reservation }) => {
    const status = STATUS_CONFIG[item.status] || STATUS_CONFIG.CONFIRMED;

    return (
      <View style={styles.cardWrapper}>
        <TouchableOpacity
          style={styles.card}
          onPress={() =>
            router.push({
              pathname: "/(modals)/reservation-qr",
              params: { id: item.id },
            })
          }
          activeOpacity={0.7}
        >
          {/* Image */}
          <View style={styles.cardImage}>
            {item.parkingLocation.image ? (
              <Image
                source={{ uri: item.parkingLocation.image }}
                style={styles.image}
                contentFit="cover"
              />
            ) : (
              <View style={styles.imagePlaceholder}>
                <MaterialIcons name="local-parking" size={24} color="#C7C7CC" />
              </View>
            )}
          </View>

          {/* Content */}
          <View style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle} numberOfLines={1}>
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

            <Text style={styles.cardAddress} numberOfLines={1}>
              {item.parkingLocation.address}
            </Text>

            <View style={styles.cardMeta}>
              <View style={styles.metaItem}>
                <MaterialIcons name="event-seat" size={14} color="#11796F" />
                <Text style={styles.metaText} numberOfLines={1}>
                  Slot {item.parkingSpace.slotNumber}
                </Text>
              </View>
              <View style={styles.metaItem}>
                <MaterialIcons name="schedule" size={14} color="#8E8E93" />
                <Text style={styles.metaText}>
                  {new Date(item.createdAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </Text>
              </View>
              <View style={styles.metaItem}>
                <MaterialIcons name="payments" size={14} color="#11796F" />
                <Text style={styles.metaText}>
                  ₱{Number(item.totalAmount).toFixed(0)}
                </Text>
              </View>
            </View>

            <View style={styles.timeRow}>
              <Text style={styles.timeText} numberOfLines={1}>
                {item.status === "PENDING" && item.arrivalDeadline
                  ? `Awaiting host approval until ${new Date(item.arrivalDeadline).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true })}`
                  : item.status === "ACTIVE" && item.sessionStartedAt
                    ? `Started ${new Date(item.sessionStartedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true })}`
                    : item.status === "COMPLETED" &&
                        item.sessionStartedAt &&
                        item.sessionEndedAt
                      ? `${new Date(item.sessionStartedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true })} - ${new Date(item.sessionEndedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true })}`
                      : item.arrivalDeadline
                        ? `Arrive by ${new Date(item.arrivalDeadline).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true })}`
                        : "Pay-as-you-go"}
              </Text>
              <MaterialIcons name="chevron-right" size={20} color="#C7C7CC" />
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialIcons name="event-note" size={64} color="#C7C7CC" />
      <Text style={styles.emptyTitle}>No reservations yet</Text>
      <Text style={styles.emptyText}>
        Book a parking spot to see your reservations here
      </Text>
      <TouchableOpacity
        style={styles.findParkingBtn}
        onPress={() => router.push("/(tabs)")}
      >
        <Text style={styles.findParkingBtnText}>Find Parking</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
      <Stack.Screen options={{ title: "My Reservations" }} />

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
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 16,
    height: 120,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    overflow: "hidden",
  },
  cardImage: { width: 90, height: 120 },
  image: { width: 90, height: 120 },
  imagePlaceholder: {
    width: 90,
    height: 120,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
  },
  cardContent: { flex: 1, padding: 12, gap: 6 },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  cardTitle: { flex: 1, fontSize: 15, fontWeight: "700", color: "#232230" },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  statusText: { fontSize: 11, fontWeight: "600" },
  cardAddress: { fontSize: 12, color: "#A09A94" },
  cardMeta: { flexDirection: "row", gap: 12, marginTop: 4 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 12, color: "#666", fontWeight: "500" },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  timeText: { fontSize: 13, fontWeight: "600", color: "#232230" },

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
  findParkingBtn: {
    backgroundColor: "#D4501E",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 20,
  },
  findParkingBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  cardWrapper: {
    marginBottom: 12,
  },
});
