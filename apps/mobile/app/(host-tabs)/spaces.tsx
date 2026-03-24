import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { hostService } from "../../src/services/hosts";

interface ParkingLocation {
  id: string;
  title: string;
  address: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  totalSlots: number | null;
  availableSlots: number | null;
  basePricePerHour: string;
}

const STATUS_CONFIG = {
  APPROVED: { label: "Approved", color: "#4CAF50", bg: "#F5F4F2" },
  PENDING: { label: "Pending", color: "#D4501E", bg: "#FFF0EC" },
  REJECTED: { label: "Rejected", color: "#E53935", bg: "#FFEBEE" },
  DISABLED: { label: "Disabled", color: "#A09A94", bg: "#F5F5F5" },
};

export default function SpacesScreen() {
  const [locations, setLocations] = useState<ParkingLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLocations = useCallback(async () => {
    try {
      const data = await hostService.getLocations({ limit: 50 });
      setLocations(data.data || []);
    } catch (err) {
      console.error("Failed to fetch locations:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchLocations();
    }, [fetchLocations]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchLocations();
  };

  const renderLocation = ({ item }: { item: ParkingLocation }) => {
    const status = STATUS_CONFIG[item.status];
    return (
      <TouchableOpacity
        style={styles.locationCard}
        activeOpacity={0.7}
        onPress={() =>
          router.push({
            pathname: "/(modals)/location-detail",
            params: { id: item.id },
          } as any)
        }
      >
        <View style={styles.locationHeader}>
          <View style={styles.locationIconBg}>
            <MaterialIcons name="local-parking" size={22} color="#D4501E" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.locationTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.locationAddress} numberOfLines={1}>
              {item.address}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <Text style={[styles.statusText, { color: status.color }]}>
              {status.label}
            </Text>
          </View>
        </View>

        <View style={styles.locationDetails}>
          <View style={styles.detailItem}>
            <MaterialIcons name="event-seat" size={16} color="#A09A94" />
            <Text style={styles.detailText}>{item.totalSlots ?? 0} slots</Text>
          </View>
          <View style={styles.detailItem}>
            <MaterialIcons name="payments" size={16} color="#A09A94" />
            <Text style={styles.detailText}>
              ₱{Number(item.basePricePerHour).toFixed(2)}/hr
            </Text>
          </View>
          <View style={styles.detailItem}>
            <MaterialIcons name="chevron-right" size={18} color="#A09A94" />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconBg}>
        <MaterialIcons name="add-location-alt" size={48} color="#D4501E" />
      </View>
      <Text style={styles.emptyTitle}>No Parking Spaces Yet</Text>
      <Text style={styles.emptyText}>
        You haven&apos;t added any parking locations. Add your first space to
        start earning.
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Spaces</Text>
        <Text style={styles.headerSubtitle}>
          {locations.length} location{locations.length !== 1 ? "s" : ""}
        </Text>
      </View>

      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator
            size="large"
            color="#D4501E"
            style={{ marginTop: 40 }}
          />
        ) : (
          <FlatList
            data={locations}
            keyExtractor={(item) => item.id}
            renderItem={renderLocation}
            ListEmptyComponent={renderEmpty}
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
        )}
      </View>

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push("/(modals)/add-location")}
        activeOpacity={0.8}
      >
        <MaterialIcons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#FFFFFF" },
  header: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#232230",
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#A09A94",
    fontWeight: "500",
    marginTop: 4,
  },
  content: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  listContent: {
    padding: 20,
    paddingBottom: 40,
    gap: 12,
  },
  locationCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    gap: 14,
  },
  locationHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  locationIconBg: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#FFF0EC",
    justifyContent: "center",
    alignItems: "center",
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#232230",
  },
  locationAddress: {
    fontSize: 13,
    color: "#A09A94",
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
  },
  locationDetails: {
    flexDirection: "row",
    gap: 20,
    paddingLeft: 56,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  detailText: {
    fontSize: 13,
    color: "#A09A94",
    fontWeight: "500",
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
    backgroundColor: "#FFF0EC",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#232230",
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#A09A94",
    textAlign: "center",
    lineHeight: 20,
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#D4501E",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#D4501E",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
});
