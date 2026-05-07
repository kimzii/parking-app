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
  WITHDRAW_APPROVED: { icon: "check-circle", color: "#1976D2", bg: "#E3F2FD" },
  WITHDRAW_REJECTED: { icon: "warning", color: "#E53935", bg: "#FFEBEE" },
  GENERAL: { icon: "notifications", color: "#D4501E", bg: "#FFF0EC" },
};

type DetailParams = {
  id?: string;
  title?: string;
  message?: string;
  type?: string;
  createdAt?: string;
  screen?: string;
  reservationId?: string;
  locationId?: string;
};

function asString(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (Array.isArray(value)) return value[0];
  return String(value);
}

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
  const params = useLocalSearchParams<DetailParams>();
  const id = asString(params.id);
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

  const buildAction = useCallback(
    async (n: { type: string; data?: Record<string, any> }) => {
      const extra = (n.data ?? {}) as Record<string, any>;
      const screen = extra.screen as string | undefined;
      const reservationId = extra.reservationId as string | undefined;
      const locationId = extra.locationId as string | undefined;
      const topUpAction = extra.action as string | undefined;

      const viewMode = await SecureStore.getItemAsync("viewMode");
      const isHost = viewMode === "host";

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
            TOPUP_APPROVED: topUpAction === "SHOW_QR" ? "top-up" : "payment",
            TOPUP_REJECTED: "top-up",
            WITHDRAW_APPROVED: "payment",
            WITHDRAW_REJECTED: "payment",
          } as Record<string, string | null>
        )[n.type];

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
      } else if (route === "top-up") {
        setAction({
          label: "Open top-up",
          onPress: () => router.push("/(modals)/top-up" as any),
        });
      } else if (route === "payment") {
        setAction({
          label: "Open wallet",
          onPress: () => router.replace("/(tabs)/payment" as any),
        });
      } else if (route === "profile") {
        setAction({
          label: "Open profile",
          onPress: () =>
            router.replace(
              (isHost ? "/(host-tabs)/profile" : "/(tabs)/profile") as any,
            ),
        });
      } else if (route === "host-home") {
        setAction({
          label: "Go to home",
          onPress: () => router.replace("/(host-tabs)" as any),
        });
      } else if (route === "my-vehicles") {
        setAction({
          label: "View vehicles",
          onPress: () => router.push("/(modals)/my-vehicles" as any),
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
    },
    [],
  );

  const load = useCallback(async () => {
    // If `id` isn't available (e.g. some push notifications), render from params.
    if (!id) {
      const title = asString(params.title);
      const message = asString(params.message);
      const type = asString(params.type) || "GENERAL";
      const createdAt = asString(params.createdAt) || new Date().toISOString();

      if (!title && !message) {
        setError("Notification not available");
        setLoading(false);
        setRefreshing(false);
        setAction(null);
        return;
      }

      const synthetic = {
        id: "",
        title: title || "Notification",
        message: message || "",
        type,
        data: {
          screen: asString(params.screen),
          reservationId: asString(params.reservationId),
          locationId: asString(params.locationId),
        },
        isRead: true,
        createdAt,
      };

      setError(null);
      setNotification(synthetic);
      await buildAction(synthetic);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      setError(null);
      const data = await getNotificationById(String(id));
      setNotification(data);
      await buildAction(data);
    } catch {
      setError("Failed to load notification");
      setAction(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [buildAction, id, params]);

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

                {notification.type === "WITHDRAW_APPROVED" &&
                  notification.data?.referenceNumber ? (
                  <View style={styles.withdrawInfoCard}>
                    <View style={styles.withdrawInfoRow}>
                      <Text style={styles.withdrawInfoLabel}>Amount</Text>
                      <Text style={styles.withdrawInfoValue}>
                        ₱{Number(notification.data.amount ?? 0).toFixed(2)}
                      </Text>
                    </View>
                    <View style={styles.withdrawInfoDivider} />
                    <View style={styles.withdrawInfoRow}>
                      <Text style={styles.withdrawInfoLabel}>Reference Code</Text>
                      <Text style={[styles.withdrawInfoValue, styles.withdrawInfoMono]}>
                        {notification.data.referenceNumber}
                      </Text>
                    </View>
                  </View>
                ) : null}

                {notification.type === "TOPUP_APPROVED" &&
                  notification.data?.referenceCode ? (
                  <View style={styles.withdrawInfoCard}>
                    <View style={styles.withdrawInfoRow}>
                      <Text style={styles.withdrawInfoLabel}>Amount</Text>
                      <Text style={styles.withdrawInfoValue}>
                        ₱{Number(notification.data.amount ?? 0).toFixed(2)}
                      </Text>
                    </View>
                    <View style={styles.withdrawInfoDivider} />
                    <View style={styles.withdrawInfoRow}>
                      <Text style={styles.withdrawInfoLabel}>Reference Code</Text>
                      <Text style={[styles.withdrawInfoValue, styles.withdrawInfoMono]}>
                        {notification.data.referenceCode}
                      </Text>
                    </View>
                  </View>
                ) : null}
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
  withdrawInfoCard: {
    marginTop: 16,
    backgroundColor: "#F5F4F2",
    borderRadius: 14,
    padding: 16,
    gap: 10,
    width: "100%",
  },
  withdrawInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  withdrawInfoLabel: {
    fontSize: 13,
    color: "#A09A94",
    fontWeight: "600",
  },
  withdrawInfoValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#232230",
  },
  withdrawInfoMono: {
    fontFamily: "monospace",
    letterSpacing: 0.5,
  },
  withdrawInfoDivider: {
    height: 1,
    backgroundColor: "#E8ECF0",
  },
});
