import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
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

/** Configure how notifications appear when the app is in the foreground */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Register for push notifications and send the token to the API
 */
export async function registerForPushNotifications(): Promise<string | null> {
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
  const tokenData = await Notifications.getExpoPushTokenAsync();
  const pushToken = tokenData.data;

  // Send token to our API
  try {
    await api.post("/notifications/register-token", { pushToken });
  } catch (err) {
    console.error("Failed to register push token:", err);
  }

  return pushToken;
}

/** Get all notifications for the current user */
export async function getNotifications(): Promise<AppNotification[]> {
  const res = await api.get("/notifications");
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

/** Notify API that driver is near a parking location (geofence trigger) */
export async function notifyDriverNearby(
  reservationId: string,
): Promise<void> {
  await api.post("/notifications/driver-nearby", { reservationId });
}
