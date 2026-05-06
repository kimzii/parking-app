import React, { useState, useCallback } from "react";
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
import * as SecureStore from "expo-secure-store";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  clearAll,
  type AppNotification,
} from "../../src/services/notifications";
import { useSocketEvent } from "../../src/hooks/useSocket";

const NOTIFICATION_ICONS: Record<
  string,
  { icon: keyof typeof MaterialIcons.glyphMap; color: string; bg: string }
> = {
  BOOKING_COMPLETED: { icon: "check-circle", color: "#4CAF50", bg: "#E8F5E9" },
  BOOKING_CANCELLED: { icon: "cancel", color: "#E53935", bg: "#FFEBEE" },
  BOOKING_PENDING: { icon: "hourglass-top", color: "#D4501E", bg: "#FFF0EC" },
  BOOKING_APPROVED: { icon: "check-circle", color: "#4CAF50", bg: "#E8F5E9" },
  DRIVER_NEARBY: { icon: "near-me", color: "#1976D2", bg: "#E3F2FD" },
  DRIVER_VERIFIED: { icon: "verified-user", color: "#4CAF50", bg: "#E8F5E9" },
  LOCATION_APPROVED: {
    icon: "check-circle",
    color: "#4CAF50",
    bg: "#E8F5E9",
  },
  LOCATION_REJECTED: { icon: "cancel", color: "#E53935", bg: "#FFEBEE" },
  TOPUP_APPROVED: { icon: "check-circle", color: "#4CAF50", bg: "#E8F5E9" },
  TOPUP_REJECTED: { icon: "warning", color: "#E53935", bg: "#FFEBEE" },
  GENERAL: { icon: "notifications", color: "#D4501E", bg: "#FFF0EC" },
};

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await getNotifications();
      setNotifications(data);
    } catch {
      console.error("Failed to fetch notifications");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Real-time: prepend new notifications as they arrive
  useSocketEvent("notification", (newNotif: AppNotification) => {
    setNotifications((prev) => [newNotif, ...prev]);
  });

  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [fetchNotifications]),
  );

  const handleMarkAsRead = async (id: string) => {
    try {
      await markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      );
    } catch {
      console.error("Failed to mark as read");
    }
  };

  const handleNotificationPress = async (item: AppNotification) => {
    if (!item.isRead) await handleMarkAsRead(item.id);

    const data = item.data ?? {};
    const screen = data.screen;
    const reservationId = data.reservationId;
    const locationId = data.locationId;

    // Determine user's current view mode for fallback routing
    const viewMode = await SecureStore.getItemAsync("viewMode");
    const isHost = viewMode === "host";

    // Use explicit screen if available, otherwise fall back to type-based routing
    const route =
      screen ||
      {
        BOOKING_COMPLETED: reservationId
          ? isHost
            ? "host-reservation-detail"
            : "reservation-qr"
          : null,
        BOOKING_CANCELLED: reservationId
          ? isHost
            ? "host-reservation-detail"
            : "reservation-qr"
          : null,
        BOOKING_APPROVED: reservationId ? "reservation-qr" : null,
        BOOKING_PENDING: reservationId ? "host-reservation-detail" : null,
        DRIVER_NEARBY: reservationId
          ? isHost
            ? "host-reservation-detail"
            : "reservation-qr"
          : null,
        DRIVER_VERIFIED: "my-reservations",
        LOCATION_APPROVED: "location-detail",
        LOCATION_REJECTED: "location-detail",
      }[item.type];

    switch (route) {
      case "reservation-qr":
        if (reservationId)
          router.push({
            pathname: "/(modals)/reservation-qr",
            params: { id: reservationId },
          });
        break;
      case "host-reservation-detail":
        if (reservationId)
          router.push({
            pathname: "/(modals)/host-reservation-detail",
            params: { id: reservationId },
          });
        break;
      case "my-reservations":
        router.push("/(modals)/my-reservations");
        break;
      case "location-detail":
        if (locationId) {
          router.push({
            pathname: "/(modals)/location-detail",
            params: { id: locationId },
          } as any);
        } else {
          // Old notifications without locationId — go to spaces list
          router.replace("/(host-tabs)/spaces" as any);
        }
        break;
      default:
        router.push({
          pathname: "/(modals)/notification-detail",
          params: { id: item.id },
        });
        break;
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {
      console.error("Failed to mark all as read");
    }
  };

  const handleClearAll = () => {
    Alert.alert(
      "Clear Notifications",
      "Delete all notifications? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: async () => {
            try {
              await clearAll();
              setNotifications([]);
            } catch {
              console.error("Failed to clear notifications");
            }
          },
        },
      ],
    );
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const renderItem = ({ item }: { item: AppNotification }) => {
    const config = NOTIFICATION_ICONS[item.type] || NOTIFICATION_ICONS.GENERAL;

    return (
      <TouchableOpacity
        style={[styles.card, !item.isRead && styles.cardUnread]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.iconContainer, { backgroundColor: config.bg }]}>
          <MaterialIcons name={config.icon} size={22} color={config.color} />
        </View>
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Text
              style={[styles.cardTitle, !item.isRead && styles.cardTitleUnread]}
              numberOfLines={1}
            >
              {item.title}
            </Text>
            <Text style={styles.cardTime}>{timeAgo(item.createdAt)}</Text>
          </View>
          <Text style={styles.cardMessage} numberOfLines={2}>
            {item.message}
          </Text>
        </View>
        {!item.isRead && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
      <Stack.Screen
        options={{
          title: "Notifications",
          headerRight: () =>
            notifications.length > 0 ? (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 14,
                  marginRight: 8,
                }}
              >
                {unreadCount > 0 && (
                  <TouchableOpacity
                    onPress={handleMarkAllAsRead}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Text style={styles.markAllText}>Read all</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={handleClearAll}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <MaterialIcons
                    name="delete-sweep"
                    size={22}
                    color="#A09A94"
                  />
                </TouchableOpacity>
              </View>
            ) : null,
        }}
      />

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#D4501E" />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.centered}>
          <View style={styles.emptyIcon}>
            <MaterialIcons
              name="notifications-none"
              size={48}
              color="#D4501E"
            />
          </View>
          <Text style={styles.emptyTitle}>No notifications yet</Text>
          <Text style={styles.emptySubtitle}>
            You'll see booking updates and alerts here
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchNotifications();
              }}
              tintColor="#D4501E"
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    paddingBottom: 60,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: "#FFF0EC",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#232230" },
  emptySubtitle: { fontSize: 14, color: "#A09A94" },
  markAllText: { fontSize: 14, fontWeight: "600", color: "#D4501E" },
  list: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 0.5,
  },
  cardUnread: {
    backgroundColor: "#FFFAF8",
    // borderWidth: 1,
    // borderColor: "#FFE0D6",
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  cardContent: { flex: 1, gap: 4 },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#232230",
    flex: 1,
    marginRight: 8,
  },
  cardTitleUnread: { fontWeight: "800" },
  cardTime: { fontSize: 12, color: "#A09A94" },
  cardMessage: { fontSize: 13, color: "#A09A94", lineHeight: 18 },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#D4501E",
  },
});
