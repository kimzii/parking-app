import { notifyDriverNearby } from "./notifications";

const GEOFENCE_TASK = "PARKING_GEOFENCE_TASK";

let taskDefined = false;
let nativeAvailable: boolean | null = null;
const notifiedReservations = new Set<string>();

/**
 * Check whether the native geofencing modules are available.
 * Returns false in Expo Go where native modules aren't linked.
 */
function isNativeAvailable(): boolean {
  if (nativeAvailable !== null) return nativeAvailable;
  try {
    const ExpoTaskManager =
      require("expo-modules-core").requireOptionalNativeModule?.(
        "ExpoTaskManager",
      );
    nativeAvailable = ExpoTaskManager != null;
  } catch {
    nativeAvailable = false;
  }
  if (!nativeAvailable) {
    console.log("Geofencing unavailable (native modules not linked)");
  }
  return nativeAvailable;
}

/**
 * Lazily define the background geofence task.
 * Skipped entirely when native modules aren't available (Expo Go).
 */
async function ensureTaskDefined() {
  if (taskDefined || !isNativeAvailable()) return;
  try {
    const TaskManager = await import("expo-task-manager");
    const Location = await import("expo-location");

    TaskManager.defineTask(GEOFENCE_TASK, async ({ data, error }: any) => {
      if (error) {
        console.error("Geofence task error:", error);
        return;
      }

      if (data?.eventType === Location.GeofencingEventType.Enter) {
        const region = data.region as {
          identifier: string;
          latitude: number;
          longitude: number;
          radius: number;
        };
        if (notifiedReservations.has(region.identifier)) return;
        notifiedReservations.add(region.identifier);
        notifyDriverNearby(region.identifier).catch((err) =>
          console.error("Failed to notify driver nearby:", err),
        );
      }
    });

    taskDefined = true;
  } catch (err) {
    console.warn("Geofence task setup failed:", err);
  }
}

/**
 * Start geofencing for a confirmed reservation.
 * Call this after a booking is confirmed so the host gets notified
 * when the driver is approaching.
 */
export async function startGeofencing(
  reservationId: string,
  latitude: number,
  longitude: number,
  radiusMeters = 500,
) {
  if (!isNativeAvailable()) return;
  try {
    await ensureTaskDefined();
    const Location = await import("expo-location");

    const { status } = await Location.requestBackgroundPermissionsAsync();
    if (status !== "granted") {
      console.log("Background location permission not granted");
      return;
    }

    await Location.startGeofencingAsync(GEOFENCE_TASK, [
      {
        identifier: reservationId,
        latitude,
        longitude,
        radius: radiusMeters,
        notifyOnEnter: true,
        notifyOnExit: false,
      },
    ]);
  } catch (err) {
    console.warn("startGeofencing failed:", err);
  }
}

/**
 * Stop geofencing (call when reservation completes or is cancelled)
 */
export async function stopGeofencing() {
  if (!isNativeAvailable()) return;
  try {
    const TaskManager = await import("expo-task-manager");
    const Location = await import("expo-location");

    const isRegistered =
      await TaskManager.isTaskRegisteredAsync(GEOFENCE_TASK);
    if (isRegistered) {
      await Location.stopGeofencingAsync(GEOFENCE_TASK);
    }
    notifiedReservations.clear();
  } catch (err) {
    console.warn("stopGeofencing failed:", err);
  }
}
