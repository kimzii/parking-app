import { useEffect, useMemo, useRef } from "react";
import { useRootNavigationState, useRouter } from "expo-router";

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
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();
  const responseListenerRef = useRef<{ remove: () => void } | null>(null);
  const receivedListenerRef = useRef<{ remove: () => void } | null>(null);
  const pendingNavRef = useRef<{
    pathname: "/(modals)/notification-detail";
    params:
      | { id: string }
      | {
          title: string;
          message: string;
          type: string;
          createdAt: string;
          screen?: string;
          reservationId?: string;
          locationId?: string;
        };
  } | null>(null);

  const isNavReady = useMemo(
    () => Boolean(rootNavigationState?.key),
    [rootNavigationState?.key],
  );

  const isNavReadyRef = useRef(false);

  useEffect(() => {
    isNavReadyRef.current = isNavReady;
  }, [isNavReady]);

  const lastHandledRequestIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isNavReady) return;
    if (!pendingNavRef.current) return;

    const nav = pendingNavRef.current;
    pendingNavRef.current = null;
    router.push(nav);
  }, [isNavReady, router]);

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

        const navigateToDetail = (input: {
          requestIdentifier: string;
          content: { title?: string | null; body?: string | null; data?: any };
        }) => {
          if (lastHandledRequestIdRef.current === input.requestIdentifier) {
            return;
          }
          lastHandledRequestIdRef.current = input.requestIdentifier;

          const content = input.content;
          const data = content.data as
            | {
                screen?: string;
                reservationId?: string;
                locationId?: string;
                notificationId?: string;
                notificationType?: string;
              }
            | undefined;

          const nav = {
            pathname: "/(modals)/notification-detail" as const,
            params: data?.notificationId
              ? { id: String(data.notificationId) }
              : {
                  title: String(content.title ?? "Notification"),
                  message: String(content.body ?? ""),
                  type: data?.notificationType
                    ? String(data.notificationType)
                    : "GENERAL",
                  createdAt: new Date().toISOString(),
                  screen: data?.screen ? String(data.screen) : "",
                  reservationId: data?.reservationId
                    ? String(data.reservationId)
                    : "",
                  locationId: data?.locationId ? String(data.locationId) : "",
                },
          };

          if (isNavReadyRef.current) {
            router.push(nav);
          } else {
            pendingNavRef.current = nav;
          }
        };

        // Listener: user tapped a notification (foreground or background)
        responseListenerRef.current =
          Notifications.addNotificationResponseReceivedListener((response) => {
            navigateToDetail({
              requestIdentifier: response.notification.request.identifier,
              content: response.notification.request.content,
            });
          });

        // Handle the case where the app was opened from a killed state by a notification tap.
        // getLastNotificationResponseAsync returns the response that launched the app.
        const lastResponse =
          await Notifications.getLastNotificationResponseAsync();
        if (lastResponse && !cancelled) {
          navigateToDetail({
            requestIdentifier: lastResponse.notification.request.identifier,
            content: lastResponse.notification.request.content,
          });
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
