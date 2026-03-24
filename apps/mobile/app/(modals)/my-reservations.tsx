import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, router, useFocusEffect } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import * as reservationsService from "../../src/services/reservations";
import * as reviewsService from "../../src/services/reviews";

function CardRating({ reservationId }: { reservationId: string }) {
  const [rating, setRating] = useState<number | null>(null);

  useEffect(() => {
    reviewsService
      .getReservationReviews(reservationId)
      .then((reviews) => {
        const mine = reviews.find(
          (r) => r.reviewType === "DRIVER_TO_LOCATION",
        );
        setRating(mine?.rating ?? null);
      })
      .catch(() => {});
  }, [reservationId]);

  if (rating === null) return null;

  return (
    <View style={{ flexDirection: "row", gap: 2, marginTop: 4 }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <MaterialIcons
          key={star}
          name={star <= rating ? "star" : "star-outline"}
          size={13}
          color={star <= rating ? "#FFB300" : "#D0D0D0"}
        />
      ))}
    </View>
  );
}

const STATUS_CONFIG = {
  PENDING: {
    color: "#D4501E",
    bg: "#FFF0EC",
    label: "Pending",
    icon: "hourglass-top",
  },
  CONFIRMED: {
    color: "#232230",
    bg: "#F5F4F2",
    label: "Confirmed",
    icon: "event-available",
  },
  ACTIVE: {
    color: "#D4501E",
    bg: "#FFF0EC",
    label: "Active",
    icon: "directions-car",
  },
  COMPLETED: {
    color: "#A09A94",
    bg: "#F5F4F2",
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
    color: "#A09A94",
    bg: "#F5F4F2",
    label: "Expired",
    icon: "timer-off",
  },
};

const PAST_STATUSES = ["COMPLETED", "CANCELLED", "EXPIRED"];

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
  const [clearedIds, setClearedIds] = useState<Set<string>>(new Set());

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

  const handleClearPast = () => {
    Alert.alert(
      "Clear Past Bookings",
      "This will hide completed, cancelled, and expired bookings from this list.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: () => {
            const pastIds = reservations
              .filter((r) => PAST_STATUSES.includes(r.status))
              .map((r) => r.id);
            setClearedIds((prev) => new Set([...prev, ...pastIds]));
          },
        },
      ],
    );
  };

  const displayedReservations = reservations.filter(
    (r) => !clearedIds.has(r.id),
  );

  const hasPastItems = displayedReservations.some((r) =>
    PAST_STATUSES.includes(r.status),
  );

  const formatDateTime = (item: reservationsService.Reservation) => {
    const date = new Date(item.createdAt).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    if (item.status === "ACTIVE" && item.sessionStartedAt) {
      const time = new Date(item.sessionStartedAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
      return `${date} · Started ${time}`;
    }
    if (
      item.status === "COMPLETED" &&
      item.sessionStartedAt &&
      item.sessionEndedAt
    ) {
      const start = new Date(item.sessionStartedAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
      const end = new Date(item.sessionEndedAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
      return `${date} · ${start} – ${end}`;
    }
    if (item.arrivalDeadline) {
      const time = new Date(item.arrivalDeadline).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
      return `${date} · Arrive by ${time}`;
    }
    return date;
  };

  const renderItem = ({ item }: { item: reservationsService.Reservation }) => {
    const status = STATUS_CONFIG[item.status] || STATUS_CONFIG.CONFIRMED;
    const slotLabel = item.parkingSpace.name
      ? `Slot ${item.parkingSpace.name}`
      : `Slot ${item.parkingSpace.slotNumber}`;

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
        {/* Top row: name + status badge */}
        <View style={styles.cardTop}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {item.parkingLocation.title}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <MaterialIcons
              name={status.icon as any}
              size={11}
              color={status.color}
            />
            <Text style={[styles.statusText, { color: status.color }]}>
              {status.label}
            </Text>
          </View>
        </View>

        {/* Address */}
        <View style={styles.addressRow}>
          <MaterialIcons name="location-on" size={13} color="#A09A94" />
          <Text style={styles.cardAddress} numberOfLines={1}>
            {item.parkingLocation.address}
          </Text>
        </View>

        {item.status === "COMPLETED" && (
          <CardRating reservationId={item.id} />
        )}

        {/* Bottom row: slot + date/time */}
        <View style={styles.cardBottom}>
          <View style={styles.slotChip}>
            <MaterialIcons name="event-seat" size={13} color="#D4501E" />
            <Text style={styles.slotText}>{slotLabel}</Text>
          </View>
          <Text style={styles.dateText}>{formatDateTime(item)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconBg}>
        <MaterialIcons name="event-note" size={36} color="#D5CEC4" />
      </View>
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
      <Stack.Screen options={{ title: "My Bookings" }} />

      {/* Filters + Clear Past */}
      <View style={styles.filtersRow}>
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

        {hasPastItems && (
          <TouchableOpacity
            style={styles.clearBtn}
            onPress={handleClearPast}
            activeOpacity={0.7}
          >
            <MaterialIcons name="delete-sweep" size={16} color="#A09A94" />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <ActivityIndicator
          size="large"
          color="#D4501E"
          style={{ marginTop: 40 }}
        />
      ) : (
        <FlatList
          data={displayedReservations}
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

  // Filters row
  filtersRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filters: {
    flex: 1,
    flexDirection: "row",
    gap: 8,
  },
  filterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F5F4F2",
  },
  filterBtnActive: {
    backgroundColor: "#D4501E",
  },
  filterText: { fontSize: 13, fontWeight: "600", color: "#A09A94" },
  filterTextActive: { color: "#fff" },
  clearBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#F5F4F2",
    justifyContent: "center",
    alignItems: "center",
  },

  // List
  list: { padding: 16, paddingTop: 4, gap: 10 },

  // Card
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    gap: 6,
    borderWidth: 1,
    borderColor: "#F0EDE8",
    shadowColor: "#232230",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  cardTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: "#232230",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  statusText: { fontSize: 11, fontWeight: "600" },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  cardAddress: { fontSize: 12, color: "#A09A94", flex: 1 },
  cardBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2,
  },
  slotChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFF0EC",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  slotText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#D4501E",
  },
  dateText: {
    fontSize: 12,
    color: "#A09A94",
    fontWeight: "500",
  },

  // Empty State
  emptyState: {
    alignItems: "center",
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  emptyIconBg: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: "#F5F4F2",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#232230",
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 14,
    color: "#A09A94",
    textAlign: "center",
    lineHeight: 20,
  },
  findParkingBtn: {
    backgroundColor: "#D4501E",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 20,
  },
  findParkingBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
