import React, { useState, useCallback, useRef, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { hostService } from "../../src/services/hosts";
import * as reservationsService from "../../src/services/reservations";
import { getUnreadCount } from "../../src/services/notifications";

interface ParkingSpot {
  id: string;
  title: string;
  address: string;
  latitude: number;
  longitude: number;
  basePricePerHour: string;
  totalSlots: number | null;
  availableSlots: number | null;
  images: { imageUrl: string }[];
}

export default function HomeScreen() {
  const [spots, setSpots] = useState<ParkingSpot[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeBookings, setActiveBookings] = useState<
    reservationsService.Reservation[]
  >([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchUnread = useCallback(async () => {
    try {
      const count = await getUnreadCount();
      setUnreadCount(count);
    } catch {
      // ignore
    }
  }, []);

  const fetchSpots = useCallback(async (search?: string) => {
    try {
      const data = await hostService.getNearbyLocations({
        limit: 20,
        search: search || undefined,
      });
      setSpots(data || []);
    } catch (err) {
      console.error("Failed to fetch parking spots:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchActiveBookings = useCallback(async () => {
    try {
      const [pending, confirmed, active] = await Promise.all([
        reservationsService.getMyReservations("PENDING"),
        reservationsService.getMyReservations("CONFIRMED"),
        reservationsService.getMyReservations("ACTIVE"),
      ]);
      setActiveBookings([...active, ...confirmed, ...pending]);
    } catch {
      // User may not be a driver yet — that's okay
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchSpots();
      fetchActiveBookings();
      fetchUnread();
    }, [fetchSpots, fetchActiveBookings, fetchUnread]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchSpots(searchQuery);
    fetchActiveBookings();
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (text.trim().length >= 2) {
        fetchSpots(text.trim());
      } else {
        fetchSpots();
      }
    }, 400);
  };

  const clearSearch = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSearchQuery("");
    fetchSpots();
  };

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  })();

  const quickActions = [
    { label: "Bookings", icon: "confirmation-number" as const, route: "/(modals)/my-reservations" as const },
    { label: "Vehicles", icon: "directions-car" as const, route: "/(modals)/my-vehicles" as const },
    { label: "Top Up", icon: "account-balance-wallet" as const, route: "/(modals)/top-up" as const },
  ];

  const renderSpot = ({ item }: { item: ParkingSpot }) => {
    const slots = item.availableSlots ?? item.totalSlots ?? 0;
    const hasSlots = slots > 0;
    const firstImage = item.images?.[0]?.imageUrl;

    return (
      <TouchableOpacity
        style={styles.spotCard}
        activeOpacity={0.75}
        onPress={() =>
          router.push({
            pathname: "/(modals)/spot-detail",
            params: { id: item.id },
          } as any)
        }
      >
        <View style={styles.spotImageContainer}>
          {firstImage ? (
            <Image
              source={{ uri: firstImage }}
              style={styles.spotImage}
              contentFit="cover"
            />
          ) : (
            <View style={styles.spotImagePlaceholder}>
              <MaterialIcons name="local-parking" size={28} color="#D5CEC4" />
            </View>
          )}
        </View>
        <View style={styles.spotContent}>
          <Text style={styles.spotTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <View style={styles.addressRow}>
            <MaterialIcons name="location-on" size={13} color="#A09A94" />
            <Text style={styles.spotAddress} numberOfLines={1}>
              {item.address}
            </Text>
          </View>
          <View style={styles.spotChips}>
            <View style={styles.priceChip}>
              <Text style={styles.priceText}>
                ₱{Number(item.basePricePerHour).toFixed(0)}/hr
              </Text>
            </View>
            <View
              style={[styles.slotsChip, !hasSlots && styles.slotsChipFull]}
            >
              <Text
                style={[styles.slotsText, !hasSlots && styles.slotsTextFull]}
              >
                {hasSlots ? `${slots} slot${slots !== 1 ? "s" : ""}` : "Full"}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconBg}>
        <MaterialIcons name="location-off" size={40} color="#D5CEC4" />
      </View>
      <Text style={styles.emptyTitle}>No Parking Spaces Found</Text>
      <Text style={styles.emptyText}>
        Try adjusting your search or check back later.
      </Text>
    </View>
  );

  const listHeader = useMemo(
    () => (
      <>
        {/* Active Booking Card */}
        {activeBookings.length > 0 && (
          <View style={{ marginBottom: 2 }}>
            {activeBookings.map((booking) => {
              const isActive = booking.status === "ACTIVE";
              const isPending = booking.status === "PENDING";
              const statusLabel = isActive
                ? "Active · Parked"
                : isPending
                  ? "Pending Approval"
                  : "Confirmed";
              return (
                <TouchableOpacity
                  key={booking.id}
                  style={styles.bookingCard}
                  activeOpacity={0.75}
                  onPress={() =>
                    router.push({
                      pathname: "/(modals)/reservation-qr",
                      params: { id: booking.id },
                    } as any)
                  }
                >
                  <View style={styles.bookingCardTop}>
                    <View style={styles.bookingStatusRow}>
                      <View
                        style={[
                          styles.dot,
                          isPending ? styles.dotPending : styles.dotActive,
                        ]}
                      />
                      <Text style={styles.bookingStatusText}>{statusLabel}</Text>
                    </View>
                    <MaterialIcons name="qr-code-2" size={20} color="#D4501E" />
                  </View>
                  <Text style={styles.bookingTitle} numberOfLines={1}>
                    {booking.parkingLocation.title}
                  </Text>
                  <View style={styles.bookingAddressContainer}>
                    <Text style={styles.bookingAddress} numberOfLines={1}>
                      {booking.parkingLocation.address}
                    </Text>
                  </View>
                  <View style={styles.bookingMeta}>
                    <View style={styles.bookingMetaLeft}>
                      <MaterialIcons
                        name="event-seat"
                        size={16}
                        color="#D4501E"
                      />
                      <Text style={styles.bookingMetaText}>
                        Slot{" "}
                        {booking.parkingSpace.name ||
                          booking.parkingSpace.slotNumber}
                      </Text>
                    </View>
                    <Text style={styles.bookingMetaDot}>·</Text>
                    <Text style={styles.bookingMetaText}>
                      ₱{Number(booking.totalAmount).toFixed(2)}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Section Title */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Parking Spaces Near You</Text>
          <Text style={styles.sectionCount}>
            {spots.length} spot{spots.length !== 1 ? "s" : ""}
          </Text>
        </View>

        {loading && (
          <ActivityIndicator
            size="large"
            color="#D4501E"
            style={{ marginTop: 40 }}
          />
        )}
      </>
    ),
    [activeBookings, spots.length, loading],
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      {/* Top Bar — lives outside FlatList to keep keyboard stable */}
      <View style={styles.topBar}>
        {/* Greeting row */}
        <View style={styles.greetingRow}>
          <Text style={styles.greetingText}>{greeting}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <TouchableOpacity
              style={styles.profileBtn}
              onPress={() => router.push("/(modals)/notifications" as any)}
              activeOpacity={0.75}
            >
              <MaterialIcons name="notifications-none" size={22} color="#232230" />
              {unreadCount > 0 && (
                <View style={styles.notifBadge}>
                  <Text style={styles.notifBadgeText}>
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.profileBtn}
              onPress={() => router.navigate("/(tabs)/profile" as any)}
              activeOpacity={0.75}
            >
              <MaterialIcons name="person-outline" size={22} color="#232230" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search bar */}
        <View style={styles.searchBar}>
          <MaterialIcons name="search" size={20} color="#A09A94" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search parking spaces..."
            placeholderTextColor="#C7C7CC"
            value={searchQuery}
            onChangeText={handleSearch}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={clearSearch}>
              <MaterialIcons name="close" size={18} color="#A09A94" />
            </TouchableOpacity>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          {quickActions.map((action) => (
            <TouchableOpacity
              key={action.label}
              style={styles.quickActionBtn}
              onPress={() => router.push(action.route as any)}
              activeOpacity={0.75}
            >
              <View style={styles.quickActionIcon}>
                <MaterialIcons name={action.icon} size={20} color="#D4501E" />
              </View>
              <Text style={styles.quickActionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={loading ? [] : spots}
        keyExtractor={(item) => item.id}
        renderItem={renderSpot}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={loading ? null : renderEmpty}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#D4501E"
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#FFFFFF" },

  // Top bar
  topBar: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 10,
    backgroundColor: "#FFFFFF",
  },
  greetingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  greetingText: {
    fontSize: 22,
    fontWeight: "700",
    color: "#232230",
    letterSpacing: -0.3,
  },
  profileBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F5F4F2",
    justifyContent: "center",
    alignItems: "center",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F4F2",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#232230",
    padding: 0,
  },
  quickActions: {
    flexDirection: "row",
    gap: 10,
  },
  quickActionBtn: {
    flex: 1,
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F5F4F2",
    borderRadius: 14,
    paddingVertical: 12,
  },
  quickActionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#FFF0EC",
    justifyContent: "center",
    alignItems: "center",
  },
  quickActionLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#232230",
  },

  // List
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
    gap: 10,
  },

  // Section header
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  sectionTitle: {
    paddingTop: 12,
    fontSize: 20,
    fontWeight: "700",
    color: "#232230",
    letterSpacing: -0.3,
  },
  sectionCount: {
    paddingTop: 12,
    fontSize: 13,
    color: "#A09A94",
    fontWeight: "500",
  },

  // Spot card
  spotCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    flexDirection: "row",
    overflow: "hidden",
    shadowColor: "#232230",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#F0EDE8",
  },
  spotImageContainer: {
    width: 90,
    height: 90,
  },
  spotImage: {
    width: 90,
    height: 90,
  },
  spotImagePlaceholder: {
    width: 90,
    height: 90,
    backgroundColor: "#F5F4F2",
    justifyContent: "center",
    alignItems: "center",
  },
  spotContent: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    justifyContent: "space-between",
  },
  spotTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#232230",
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginTop: 3,
  },
  spotAddress: {
    fontSize: 12,
    color: "#A09A94",
    flex: 1,
  },
  spotChips: {
    flexDirection: "row",
    gap: 6,
    marginTop: 8,
  },
  priceChip: {
    backgroundColor: "#FFF0EC",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priceText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#D4501E",
  },
  slotsChip: {
    backgroundColor: "#F5F4F2",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  slotsChipFull: {
    backgroundColor: "#F5F4F2",
  },
  slotsText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#232230",
  },
  slotsTextFull: {
    color: "#A09A94",
  },

  // Empty state
  emptyState: {
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 40,
  },
  emptyIconBg: {
    width: 80,
    height: 80,
    borderRadius: 24,
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

  // Booking card
  bookingCard: {
  backgroundColor: "#F5F4F2", // soft gray like other surfaces
  borderRadius: 16,
  padding: 16,
  marginTop: 4,
  shadowColor: "#232230",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 10,
  elevation: 3,
  borderWidth: 1,
  borderColor: "#D4501E", // orange border to stand out
  },
  bookingCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  bookingStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    backgroundColor: "#D4501E",
  },
  dotPending: {
    backgroundColor: "#FFC9AE",
  },
  bookingStatusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#D4501E",
  },
  bookingTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#232230",
  },
  bookingAddressContainer: {
    marginTop: 3,
  },
  bookingAddress: {
    fontSize: 13,
    color: "#A09A94",
  },
  bookingMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
  },
  bookingMetaLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  bookingMetaText: {
    fontSize: 13,
    fontWeight: "600",
  color: "#D4501E",
  },
  bookingMetaDot: {
    fontSize: 13,
    color: "#A09A94",
  },
  notifBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#E53935",
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 3,
  },
  notifBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#fff",
  },
});
