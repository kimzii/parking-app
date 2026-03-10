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
    color: "#F57C00",
    bg: "#FFF3E0",
    label: "Pending",
    icon: "hourglass-empty",
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
};

const FILTERS = [
  { key: "all", label: "All" },
  { key: "CONFIRMED", label: "Upcoming" },
  { key: "ACTIVE", label: "Active" },
  { key: "COMPLETED", label: "Past" },
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
    const status = STATUS_CONFIG[item.status] || STATUS_CONFIG.PENDING;
    const startTime = new Date(item.startTime);
    const endTime = new Date(item.endTime);

    return (
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
              <Text style={styles.metaText}>
                Slot {item.parkingSpace.slotNumber}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <MaterialIcons name="schedule" size={14} color="#8E8E93" />
              <Text style={styles.metaText}>
                {startTime.toLocaleDateString(undefined, {
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
            <Text style={styles.timeText}>
              {startTime.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}{" "}
              -{" "}
              {endTime.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
            <MaterialIcons name="chevron-right" size={20} color="#C7C7CC" />
          </View>
        </View>
      </TouchableOpacity>
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
    <SafeAreaView style={styles.container} edges={["bottom"]}>
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
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    overflow: "hidden",
  },
  cardImage: { width: 90 },
  image: { width: 90, height: "100%" },
  imagePlaceholder: {
    width: 90,
    height: "100%",
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
  cardTitle: { flex: 1, fontSize: 15, fontWeight: "700", color: "#1A1A2E" },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  statusText: { fontSize: 11, fontWeight: "600" },
  cardAddress: { fontSize: 12, color: "#8E8E93" },
  cardMeta: { flexDirection: "row", gap: 12, marginTop: 4 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 12, color: "#666", fontWeight: "500" },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  timeText: { fontSize: 13, fontWeight: "600", color: "#1A1A2E" },

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
  findParkingBtn: {
    backgroundColor: "#11796F",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 20,
  },
  findParkingBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
