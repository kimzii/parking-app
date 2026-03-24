import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { notifyDriverNearby } from "./notifications";

const GEOFENCE_TASK = "PARKING_GEOFENCE_TASK";

/** Define the background task that fires when a geofence is entered */
TaskManager.defineTask(GEOFENCE_TASK, ({ data, error }: any) => {
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

    // The identifier is the reservationId
    notifyDriverNearby(region.identifier).catch((err) =>
      console.error("Failed to notify driver nearby:", err),
    );
  }
});

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
}

/**
 * Stop geofencing (call when reservation completes or is cancelled)
 */
export async function stopGeofencing() {
  const isRegistered = await TaskManager.isTaskRegisteredAsync(GEOFENCE_TASK);
  if (isRegistered) {
    await Location.stopGeofencingAsync(GEOFENCE_TASK);
  }
}
