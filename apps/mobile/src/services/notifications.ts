import { Platform } from "react-native";
import api from "./api";

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  data?: Record<string, any>;
  isRead: boolean;
  createdAt: string;
}

/**
 * Register for push notifications and send the token to the API.
 * Native modules are loaded lazily so the app doesn't crash in Expo Go.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  try {
    const Notifications = await import("expo-notifications");
    const Device = await import("expo-device");

    // Note: setNotificationHandler is configured in useNotificationSetup hook
    // (root _layout.tsx) so it runs early for both foreground and tap handling.

    if (!Device.isDevice) {
      console.log("Push notifications require a physical device");
      return null;
    }

    // Check / request permissions
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("Push notification permission not granted");
      return null;
    }

    // Android notification channel
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Default",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#D4501E",
      });
    }

    // Get Expo push token
    const Constants = await import("expo-constants");
    const projectId =
      Constants.default.expoConfig?.extra?.eas?.projectId ??
      "acc0c135-3a0e-4177-9eef-0a3c06f896f6";
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const pushToken = tokenData.data;
    console.log("Push token registered:", pushToken);

    // Send token to our API
    await api.post("/notifications/register-token", { pushToken });

    return pushToken;
  } catch (err) {
    console.warn("Push notification setup failed (expected in Expo Go):", err);
    return null;
  }
}

/** Get all notifications for the current user */
export async function getNotifications(): Promise<AppNotification[]> {
  const res = await api.get("/notifications");
  return res.data;
}

/** Get a single notification by id */
export async function getNotificationById(
  notificationId: string,
): Promise<AppNotification> {
  const res = await api.get(`/notifications/${notificationId}`);
  return res.data;
}

/** Get unread notification count */
export async function getUnreadCount(): Promise<number> {
  const res = await api.get("/notifications/unread-count");
  return res.data.count;
}

/** Mark a single notification as read */
export async function markAsRead(notificationId: string): Promise<void> {
  await api.patch(`/notifications/${notificationId}/read`);
}

/** Mark all notifications as read */
export async function markAllAsRead(): Promise<void> {
  await api.patch("/notifications/read-all");
}

/** Clear all notifications */
export async function clearAll(): Promise<void> {
  await api.delete("/notifications/clear-all");
}

/** Notify API that driver is near a parking location (geofence trigger) */
export async function notifyDriverNearby(reservationId: string): Promise<void> {
  await api.post("/notifications/driver-nearby", { reservationId });
}

/** Notify API that driver has arrived at the parking location */
export async function notifyDriverArrived(
  reservationId: string,
): Promise<void> {
  await api.post("/notifications/driver-arrived", { reservationId });
}
