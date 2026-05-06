import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";

import { getNotificationById } from "../../src/services/notifications";

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

type DetailParams = {
  id?: string;
};

function formatDate(dateStr?: string) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;

  return date.toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function NotificationDetailScreen() {
  const { id } = useLocalSearchParams<DetailParams>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    id: string;
    title: string;
    message: string;
    type: string;
    data?: Record<string, any>;
    isRead: boolean;
    createdAt: string;
  } | null>(null);

  const [action, setAction] = useState<null | {
    label: string;
    onPress: () => void;
  }>(null);

  const load = useCallback(async () => {
    if (!id) {
      setError("Missing notification id");
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      setError(null);
      const data = await getNotificationById(String(id));
      setNotification(data);

      const extra = (data?.data ?? {}) as Record<string, any>;
      const screen = extra.screen as string | undefined;
      const reservationId = extra.reservationId as string | undefined;
      const locationId = extra.locationId as string | undefined;

      const viewMode = await SecureStore.getItemAsync("viewMode");
      const isHost = viewMode === "host";

      // Use explicit screen if available, otherwise fall back to type-based routing
      const route =
        screen ||
        (
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
          } as Record<string, string | null>
        )[data.type];

      if (route === "reservation-qr" && reservationId) {
        setAction({
          label: "View reservation",
          onPress: () =>
            router.push({
              pathname: "/(modals)/reservation-qr",
              params: { id: reservationId },
            }),
        });
      } else if (route === "host-reservation-detail" && reservationId) {
        setAction({
          label: "View reservation",
          onPress: () =>
            router.push({
              pathname: "/(modals)/host-reservation-detail",
              params: { id: reservationId },
            }),
        });
      } else if (route === "my-reservations") {
        setAction({
          label: "View reservations",
          onPress: () => router.push("/(modals)/my-reservations"),
        });
      } else if (route === "location-detail") {
        if (locationId) {
          setAction({
            label: "View parking space",
            onPress: () =>
              router.push({
                pathname: "/(modals)/location-detail",
                params: { id: locationId },
              } as any),
          });
        } else {
          setAction({
            label: "View spaces",
            onPress: () => router.replace("/(host-tabs)/spaces" as any),
          });
        }
      } else {
        setAction(null);
      }
    } catch {
      setError("Failed to load notification");
      setAction(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  React.useEffect(() => {
    load();
  }, [load]);

  const iconConfig =
    NOTIFICATION_ICONS[notification?.type ?? ""] || NOTIFICATION_ICONS.GENERAL;

  return (
    <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
      <Stack.Screen
        options={{
          title: "Inbox",
          headerStyle: { backgroundColor: "#D4501E" },
          headerTintColor: "#fff",
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={{ paddingHorizontal: 6 }}
            >
              <MaterialIcons name="arrow-back" size={22} color="#fff" />
            </TouchableOpacity>
          ),
        }}
      />

      <View style={styles.body}>
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#D4501E" />
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <Text style={styles.errorTitle}>{error}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => {
                setRefreshing(true);
                load();
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : !notification ? (
          <View style={styles.centered}>
            <Text style={styles.errorTitle}>Notification not found</Text>
          </View>
        ) : (
          <>
            <ScrollView
              contentContainerStyle={styles.content}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={() => {
                    setRefreshing(true);
                    load();
                  }}
                  tintColor="#D4501E"
                />
              }
            >
              <View style={styles.card}>
                <View style={styles.iconPill}>
                  <View
                    style={[
                      styles.iconCircle,
                      { backgroundColor: iconConfig.bg },
                    ]}
                  >
                    <MaterialIcons
                      name={iconConfig.icon}
                      size={26}
                      color={iconConfig.color}
                    />
                  </View>
                </View>

                <Text style={styles.date}>
                  {formatDate(notification.createdAt)}
                </Text>
                <Text style={styles.titleCenter}>{notification.title}</Text>
                <Text style={styles.messageCenter}>{notification.message}</Text>
              </View>
            </ScrollView>

            {action ? (
              <View style={styles.footer}>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={action.onPress}
                  activeOpacity={0.85}
                >
                  <Text style={styles.primaryButtonText}>{action.label}</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  body: { flex: 1 },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 120,
    gap: 14,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 0.5,
  },
  iconPill: { alignItems: "center" },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  date: {
    marginTop: 14,
    fontSize: 13,
    color: "#A09A94",
    textAlign: "center",
  },
  titleCenter: {
    marginTop: 10,
    fontSize: 26,
    fontWeight: "900",
    color: "#232230",
    textAlign: "center",
  },
  messageCenter: {
    marginTop: 14,
    fontSize: 16,
    color: "#232230",
    lineHeight: 24,
    textAlign: "center",
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#232230",
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: "#D4501E",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  retryText: { color: "#fff", fontWeight: "700" },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 18,
    paddingBottom: 18,
    paddingTop: 10,
    backgroundColor: "#FFFFFF",
  },
  primaryButton: {
    backgroundColor: "#D4501E",
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
});
