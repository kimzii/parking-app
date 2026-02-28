import React, { useState, useCallback, useRef } from "react";
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
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { hostService } from "../../src/services/hosts";

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
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  useFocusEffect(
    useCallback(() => {
      fetchSpots();
    }, [fetchSpots]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchSpots(searchQuery);
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

  const renderSpot = ({ item }: { item: ParkingSpot }) => {
    const slots = item.availableSlots ?? item.totalSlots ?? 0;
    const slotsColor = slots > 0 ? "#4CAF50" : "#E53935";

    return (
      <TouchableOpacity
        style={styles.spotCard}
        activeOpacity={0.7}
        onPress={() =>
          router.push({
            pathname: "/(modals)/spot-detail",
            params: { id: item.id },
          } as any)
        }
      >
        <View style={styles.spotHeader}>
          <View style={styles.spotIconBg}>
            <MaterialIcons name="local-parking" size={22} color="#11796F" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.spotTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <View style={styles.addressRow}>
              <MaterialIcons name="location-on" size={14} color="#8E8E93" />
              <Text style={styles.spotAddress} numberOfLines={1}>
                {item.address}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.spotDetails}>
          <View style={styles.detailChip}>
            <MaterialIcons name="payments" size={16} color="#11796F" />
            <Text style={styles.detailChipText}>
              ₱{Number(item.basePricePerHour).toFixed(2)}/hr
            </Text>
          </View>
          <View style={styles.detailChip}>
            <MaterialIcons name="event-seat" size={16} color={slotsColor} />
            <Text style={[styles.detailChipText, { color: slotsColor }]}>
              {slots} slot{slots !== 1 ? "s" : ""} available
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconBg}>
        <MaterialIcons name="location-off" size={48} color="#11796F" />
      </View>
      <Text style={styles.emptyTitle}>No Parking Spaces Available</Text>
      <Text style={styles.emptyText}>
        There are no approved parking locations yet. Check back later!
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome to</Text>
          <Text style={styles.appName}>ParkLink</Text>
        </View>
        <View style={styles.logoIcon}>
          <MaterialIcons name="local-parking" size={24} color="#fff" />
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchBar}>
        <MaterialIcons name="search" size={20} color="#8E8E93" />
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
            <MaterialIcons name="close" size={20} color="#8E8E93" />
          </TouchableOpacity>
        )}
      </View>

      {/* Quick Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: "#E8F5F3" }]}>
            <MaterialIcons name="local-parking" size={20} color="#11796F" />
          </View>
          <Text style={styles.statValue}>{spots.length}</Text>
          <Text style={styles.statLabel}>Available</Text>
        </View>
        <TouchableOpacity
          style={styles.statCard}
          onPress={() => router.navigate("/(tabs)/map" as any)}
          activeOpacity={0.7}
        >
          <View style={[styles.statIcon, { backgroundColor: "#E3F2FD" }]}>
            <MaterialIcons name="map" size={20} color="#1976D2" />
          </View>
          <Text style={styles.statValue}>Map</Text>
          <Text style={styles.statLabel}>View Map</Text>
        </TouchableOpacity>
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: "#FFF3E0" }]}>
            <MaterialIcons name="history" size={20} color="#F57C00" />
          </View>
          <Text style={styles.statValue}>0</Text>
          <Text style={styles.statLabel}>Bookings</Text>
        </View>
      </View>

      {/* Section Title */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Available Parking Spaces</Text>
        <Text style={styles.sectionCount}>
          {spots.length} spot{spots.length !== 1 ? "s" : ""}
        </Text>
      </View>

      {/* Spots List */}
      <View style={styles.listContainer}>
        {loading ? (
          <ActivityIndicator
            size="large"
            color="#11796F"
            style={{ marginTop: 40 }}
          />
        ) : (
          <FlatList
            data={spots}
            keyExtractor={(item) => item.id}
            renderItem={renderSpot}
            ListEmptyComponent={renderEmpty}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#11796F"
              />
            }
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
    paddingTop: 8,
    paddingBottom: 16,
  },
  greeting: { fontSize: 14, color: "#8E8E93" },
  appName: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1A1A2E",
    letterSpacing: -0.5,
  },
  logoIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#11796F",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#11796F",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginHorizontal: 24,
    marginBottom: 16,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#1A1A2E",
    padding: 0,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1A1A2E",
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#8E8E93",
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A2E",
  },
  sectionCount: {
    fontSize: 13,
    fontWeight: "600",
    color: "#8E8E93",
  },
  listContainer: { flex: 1 },
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 20,
    gap: 12,
  },
  spotCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    gap: 12,
  },
  spotHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  spotIconBg: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#E8F5F3",
    justifyContent: "center",
    alignItems: "center",
  },
  spotTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A2E",
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginTop: 3,
  },
  spotAddress: {
    fontSize: 13,
    color: "#8E8E93",
    flex: 1,
  },
  spotDetails: {
    flexDirection: "row",
    gap: 12,
    paddingLeft: 56,
  },
  detailChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F8FAFB",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  detailChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1A1A2E",
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 40,
  },
  emptyIconBg: {
    width: 96,
    height: 96,
    borderRadius: 32,
    backgroundColor: "#E8F5F3",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1A1A2E",
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#8E8E93",
    textAlign: "center",
    lineHeight: 20,
  },
});
