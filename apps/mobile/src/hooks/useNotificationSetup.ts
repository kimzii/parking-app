import { useEffect, useRef } from "react";
import { router } from "expo-router";

/**
 * Root-level notification listener hook.
 * Registers early so that notification taps (even from a killed state)
 * are handled before any screen mounts.
 *
 * - Foreground: shows the notification as a banner
 * - Tap response: deep-links to the screen specified in notification data
 *
 * Must be called once in the root _layout.tsx.
 */
export function useNotificationSetup() {
  const responseListenerRef = useRef<{ remove: () => void } | null>(null);
  const receivedListenerRef = useRef<{ remove: () => void } | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const Notifications = await import("expo-notifications");

        // Foreground display — show banner + sound
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldShowBanner: true,
            shouldShowList: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
          }),
        });

        if (cancelled) return;

        // Listener: notification received while app is in foreground
        receivedListenerRef.current =
          Notifications.addNotificationReceivedListener((notification) => {
            // You can add foreground refresh logic here if needed
            console.log(
              "Notification received:",
              notification.request.content.title,
            );
          });

        // Listener: user tapped a notification (foreground, background, or killed)
        responseListenerRef.current =
          Notifications.addNotificationResponseReceivedListener((response) => {
            const data = response.notification.request.content.data as
              | {
                  screen?: string;
                  reservationId?: string;
                  locationId?: string;
                  notificationId?: string;
                }
              | undefined;

            if (data?.notificationId) {
              router.push({
                pathname: "/(modals)/notification-detail",
                params: { id: data.notificationId },
              });
              return;
            }

            const screen = data?.screen;

            // Map notification data.screen to actual routes
            if (screen === "reservation-qr" && data?.reservationId) {
              router.push({
                pathname: "/(modals)/reservation-qr",
                params: { id: data.reservationId },
              });
            } else if (
              screen === "host-reservation-detail" &&
              data?.reservationId
            ) {
              router.push({
                pathname: "/(modals)/host-reservation-detail",
                params: { id: data.reservationId },
              });
            } else if (screen === "my-reservations") {
              router.push("/(modals)/my-reservations");
            } else if (screen === "location-detail" && data?.locationId) {
              router.push({
                pathname: "/(modals)/location-detail",
                params: { id: data.locationId },
              });
            }
          });

        // Handle the case where the app was opened from a killed state by a notification tap.
        // getLastNotificationResponseAsync returns the response that launched the app.
        const lastResponse =
          await Notifications.getLastNotificationResponseAsync();
        if (lastResponse && !cancelled) {
          const data = lastResponse.notification.request.content.data as
            | {
                screen?: string;
                reservationId?: string;
                locationId?: string;
                notificationId?: string;
              }
            | undefined;

          if (data?.notificationId) {
            router.push({
              pathname: "/(modals)/notification-detail",
              params: { id: data.notificationId },
            });
            return;
          }

          if (data?.screen === "reservation-qr" && data.reservationId) {
            router.push({
              pathname: "/(modals)/reservation-qr",
              params: { id: data.reservationId },
            });
          } else if (
            data?.screen === "host-reservation-detail" &&
            data.reservationId
          ) {
            router.push({
              pathname: "/(modals)/host-reservation-detail",
              params: { id: data.reservationId },
            });
          }
        }
      } catch (err) {
        // Expected to fail in Expo Go — native module not available
        console.log("Notification setup skipped (expected in Expo Go):", err);
      }
    })();

    return () => {
      cancelled = true;
      responseListenerRef.current?.remove();
      receivedListenerRef.current?.remove();
    };
  }, []);
}
