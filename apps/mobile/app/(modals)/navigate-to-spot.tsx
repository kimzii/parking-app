import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import * as Location from "expo-location";
import { notifyDriverNearby, notifyDriverArrived } from "../../src/services/notifications";

const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

// Distance in meters to consider "off route" and trigger reroute
const REROUTE_THRESHOLD_METERS = 50;
// Minimum interval between reroute requests (ms)
const REROUTE_COOLDOWN_MS = 10000;
// Proximity thresholds for notifications
const NEARBY_THRESHOLD_METERS = 500;
const ARRIVED_THRESHOLD_METERS = 12;

interface StepInfo {
  instruction: string;
  distance: string;
  maneuver: string;
  endLocation: { latitude: number; longitude: number };
}

interface DirectionsInfo {
  distance: string;
  duration: string;
  routeCoords: { latitude: number; longitude: number }[];
  steps: StepInfo[];
}

function decodePolyline(
  encoded: string,
): { latitude: number; longitude: number }[] {
  const points: { latitude: number; longitude: number }[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return points;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "");
}

/** Haversine distance between two coordinates in meters */
function getDistanceMeters(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * sinLng * sinLng;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/** Find minimum distance from a point to any point on the route */
function minDistanceToRoute(
  point: { latitude: number; longitude: number },
  route: { latitude: number; longitude: number }[],
): number {
  let min = Infinity;
  for (const coord of route) {
    const d = getDistanceMeters(point, coord);
    if (d < min) min = d;
  }
  return min;
}

/**
 * Find the route start index ahead of the driver's position.
 * Uses a dot-product check to determine if the driver has passed the closest
 * point, so the polyline never draws backward behind the icon.
 */
function routeStartIndex(
  point: { latitude: number; longitude: number },
  route: { latitude: number; longitude: number }[],
): number {
  if (route.length < 2) return 0;

  let minDist = Infinity;
  let minIdx = 0;
  for (let i = 0; i < route.length; i++) {
    const d = getDistanceMeters(point, route[i]);
    if (d < minDist) {
      minDist = d;
      minIdx = i;
    }
  }

  // Check if the driver has passed the closest point using a dot-product
  if (minIdx < route.length - 1) {
    const A = route[minIdx];
    const B = route[minIdx + 1];
    const abLat = B.latitude - A.latitude;
    const abLng = B.longitude - A.longitude;
    const apLat = point.latitude - A.latitude;
    const apLng = point.longitude - A.longitude;
    if (abLat * apLat + abLng * apLng > 0) {
      // Driver is past point A heading toward B — start from B
      return minIdx + 1;
    }
  }

  return minIdx;
}

export default function NavigateToSpotScreen() {
  const { lat, lng, title, address, vehicleType, reservationId } =
    useLocalSearchParams<{
      lat: string;
      lng: string;
      title: string;
      address: string;
      vehicleType?: string;
      reservationId?: string;
    }>();

  const isMoto = /motor|moto|bike|motorcycle/i.test(vehicleType ?? "");
  const vehicleIcon: keyof typeof MaterialIcons.glyphMap = isMoto
    ? "two-wheeler"
    : "directions-car";

  const destLat = parseFloat(lat || "0");
  const destLng = parseFloat(lng || "0");

  const mapRef = useRef<MapView>(null);
  const locationSubRef = useRef<Location.LocationSubscription | null>(null);
  const lastRerouteRef = useRef<number>(0);
  const nearbyNotifiedRef = useRef(false);
  const arrivedNotifiedRef = useRef(false);
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [directions, setDirections] = useState<DirectionsInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [rerouting, setRerouting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  /** Fetch directions from a given origin */
  const fetchDirections = useCallback(
    async (origin: { latitude: number; longitude: number }) => {
      if (!GOOGLE_MAPS_API_KEY) {
        setError("Maps API key not configured");
        setLoading(false);
        return;
      }
      try {
        const originStr = `${origin.latitude},${origin.longitude}`;
        const destination = `${destLat},${destLng}`;
        const res = await fetch(
          `https://maps.googleapis.com/maps/api/directions/json?origin=${originStr}&destination=${destination}&mode=driving&key=${GOOGLE_MAPS_API_KEY}`,
        );
        const data = await res.json();

        if (data.routes?.length > 0) {
          const route = data.routes[0];
          const leg = route.legs[0];
          const routeCoords = decodePolyline(route.overview_polyline.points);
          const steps = leg.steps.map(
            (step: {
              html_instructions: string;
              distance: { text: string };
              maneuver?: string;
              end_location: { lat: number; lng: number };
            }) => ({
              instruction: stripHtml(step.html_instructions),
              distance: step.distance.text,
              maneuver: step.maneuver || "",
              endLocation: {
                latitude: step.end_location.lat,
                longitude: step.end_location.lng,
              },
            }),
          );

          setDirections({
            distance: leg.distance.text,
            duration: leg.duration.text,
            routeCoords,
            steps,
          });
          setCurrentStepIndex(0);

          // Fit map to route
          setTimeout(() => {
            if (mapRef.current && routeCoords.length > 0) {
              mapRef.current.fitToCoordinates(
                [
                  origin,
                  { latitude: destLat, longitude: destLng },
                  ...routeCoords,
                ],
                {
                  edgePadding: { top: 80, right: 60, bottom: 200, left: 60 },
                  animated: true,
                },
              );
            }
          }, 500);
        } else {
          setError("No route found to destination");
        }
      } catch {
        setError("Failed to load directions");
      } finally {
        setLoading(false);
        setRerouting(false);
      }
    },
    [destLat, destLng],
  );

  // Request permission and start watching location
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setError("Location permission is required for navigation");
          setLoading(false);
          return;
        }

        // Get initial location
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        const initial = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        };
        if (!cancelled) {
          setUserLocation(initial);
          fetchDirections(initial);
        }

        // Start continuous tracking — tight intervals for smooth icon movement
        const sub = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.BestForNavigation,
            distanceInterval: 5, // update every 5 meters
            timeInterval: 1000, // or every 1 second
          },
          (location) => {
            if (cancelled) return;
            setUserLocation({
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            });
          },
        );

        if (!cancelled) {
          locationSubRef.current = sub;
        } else {
          sub.remove();
        }
      } catch {
        if (!cancelled) {
          setError("Failed to get your location");
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      locationSubRef.current?.remove();
    };
  }, [fetchDirections]);

  // Detect off-route and auto-reroute
  useEffect(() => {
    if (!userLocation || !directions || rerouting) return;

    const distToRoute = minDistanceToRoute(
      userLocation,
      directions.routeCoords,
    );

    if (distToRoute > REROUTE_THRESHOLD_METERS) {
      const now = Date.now();
      if (now - lastRerouteRef.current > REROUTE_COOLDOWN_MS) {
        lastRerouteRef.current = now;
        setRerouting(true);
        fetchDirections(userLocation);
      }
    }
  }, [userLocation, directions, rerouting, fetchDirections]);

  // Auto-advance step when user is within 30m of the current step's end point
  useEffect(() => {
    if (!userLocation || !directions || directions.steps.length === 0) return;

    const step = directions.steps[currentStepIndex];
    if (!step) return;

    const distToStepEnd = getDistanceMeters(userLocation, step.endLocation);

    // When within 30m of the step endpoint, advance to next step
    if (distToStepEnd < 30 && currentStepIndex < directions.steps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    }
  }, [userLocation, directions, currentStepIndex]);

  // ── Proximity notifications (500m "Almost There" + 12m "Arrived") ──
  useEffect(() => {
    if (!userLocation || !reservationId) return;

    const dest = { latitude: destLat, longitude: destLng };
    const distToDest = getDistanceMeters(userLocation, dest);

    // 500m — "Almost There" notification to both driver and host
    if (
      distToDest <= NEARBY_THRESHOLD_METERS &&
      !nearbyNotifiedRef.current
    ) {
      nearbyNotifiedRef.current = true;
      notifyDriverNearby(reservationId).catch((err) =>
        console.error("Failed to send nearby notification:", err),
      );
    }

    // 12m — "Arrived" notification to driver, then redirect
    if (
      distToDest <= ARRIVED_THRESHOLD_METERS &&
      !arrivedNotifiedRef.current
    ) {
      arrivedNotifiedRef.current = true;
      notifyDriverArrived(reservationId)
        .then(() => {
          Alert.alert(
            "You've Arrived!",
            "You have reached your parking destination. Redirecting to your booking session...",
            [
              {
                text: "OK",
                onPress: () =>
                  router.replace({
                    pathname: "/(modals)/reservation-qr",
                    params: { id: reservationId },
                  }),
              },
            ],
          );
        })
        .catch((err: unknown) => {
          console.error("Failed to send arrived notification:", err);
          // Still redirect even if notification fails
          router.replace({
            pathname: "/(modals)/reservation-qr",
            params: { id: reservationId },
          });
        });
    }
  }, [userLocation, reservationId, destLat, destLng]);

  const handleRecenter = () => {
    if (!mapRef.current || !userLocation) return;
    mapRef.current.animateToRegion(
      {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      },
      500,
    );
  };

  // Get the maneuver icon for the current step
  const getManeuverIcon = (
    maneuver: string,
  ): keyof typeof MaterialIcons.glyphMap => {
    if (maneuver.includes("left")) return "turn-left";
    if (maneuver.includes("right")) return "turn-right";
    if (maneuver.includes("uturn")) return "u-turn-left";
    if (maneuver.includes("merge")) return "merge-type";
    if (maneuver.includes("ramp")) return "ramp-left";
    if (maneuver.includes("roundabout")) return "roundabout-left";
    return "straight";
  };

  const insets = useSafeAreaInsets();
  const currentStep = directions?.steps[currentStepIndex];
  const nextStepInfo =
    directions && currentStepIndex < directions.steps.length - 1
      ? directions.steps[currentStepIndex + 1]
      : null;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Full-screen map */}
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
        showsUserLocation={false}
        showsMyLocationButton={false}
        initialRegion={{
          latitude: destLat,
          longitude: destLng,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      >
        <Marker
          coordinate={{ latitude: destLat, longitude: destLng }}
          title={title || "Parking Location"}
          description={address || ""}
        >
          <View style={styles.destMarker}>
            <MaterialIcons name="local-parking" size={20} color="#fff" />
          </View>
        </Marker>

        {/* Custom user location marker */}
        {userLocation && (
          <Marker coordinate={userLocation} anchor={{ x: 0.5, y: 0.5 }} flat>
            <View style={styles.userMarker}>
              <MaterialIcons name={vehicleIcon} size={18} color="#fff" />
            </View>
          </Marker>
        )}

        {directions && directions.routeCoords.length > 0 && userLocation && (
          <Polyline
            coordinates={[
              userLocation,
              ...directions.routeCoords.slice(
                routeStartIndex(userLocation, directions.routeCoords),
              ),
            ]}
            strokeColor="#D4501E"
            strokeWidth={5}
          />
        )}
      </MapView>

      {/* ── Top overlay row: back + recenter ── */}
      <View style={[styles.topRow, { top: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="chevron-left" size={32} color="#D4501E" />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleRecenter}>
          <MaterialIcons name="my-location" size={26} color="#D4501E" />
        </TouchableOpacity>
      </View>

      {/* ── Instruction banner (below top row) ── */}
      {directions && currentStep && !error && (
        <View style={[styles.instructionBanner, { top: insets.top + 58 }]}>
          <View style={styles.instructionIconCircle}>
            <MaterialIcons
              name={getManeuverIcon(currentStep.maneuver)}
              size={28}
              color="#fff"
            />
          </View>
          <View style={styles.instructionTextContainer}>
            <Text style={styles.instructionDistance}>{currentStep.distance}</Text>
            <Text style={styles.instructionText} numberOfLines={2}>
              {currentStep.instruction}
            </Text>
          </View>
        </View>
      )}

      {/* ── Bottom nav card ── */}
      {directions && !error && (
        <View style={[styles.navCard, { bottom: Math.max(insets.bottom, 16) + 8 }]}>
          {rerouting && (
            <View style={styles.reroutingBanner}>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={styles.reroutingText}>Rerouting...</Text>
            </View>
          )}

          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <MaterialIcons name="schedule" size={18} color="#D4501E" />
              <Text style={styles.summaryValue}>{directions.duration}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <MaterialIcons name="straighten" size={18} color="#D4501E" />
              <Text style={styles.summaryValue}>{directions.distance}</Text>
            </View>
          </View>

          <View style={styles.destInfo}>
            <MaterialIcons name="local-parking" size={20} color="#D4501E" />
            <View style={styles.destText}>
              <Text style={styles.destTitle} numberOfLines={1}>
                {title || "Parking Location"}
              </Text>
              {address ? (
                <Text style={styles.destAddress} numberOfLines={1}>
                  {address}
                </Text>
              ) : null}
            </View>
          </View>

          {nextStepInfo && (
            <View style={styles.nextStepContainer}>
              <Text style={styles.nextStepLabel}>Then</Text>
              <View style={styles.nextStepRow}>
                <MaterialIcons
                  name={getManeuverIcon(nextStepInfo.maneuver)}
                  size={18}
                  color="#A09A94"
                />
                <Text style={styles.nextStepText} numberOfLines={1}>
                  {nextStepInfo.instruction}
                </Text>
                <Text style={styles.nextStepDist}>{nextStepInfo.distance}</Text>
              </View>
            </View>
          )}
        </View>
      )}

      {/* ── Loading overlay ── */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#D4501E" />
          <Text style={styles.loadingText}>Calculating route...</Text>
        </View>
      )}

      {/* ── Error overlay ── */}
      {error && (
        <View style={styles.errorOverlay}>
          <MaterialIcons name="error-outline" size={36} color="#E53935" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },

  // Top overlay row
  topRow: {
    position: "absolute",
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  // User location marker (vehicle icon)
  userMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#232230",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },

  // Destination marker
  destMarker: {
    backgroundColor: "#D4501E",
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },

  // Loading / Error overlays
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.85)",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: { fontSize: 15, color: "#232230", fontWeight: "600" },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.92)",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    padding: 32,
  },
  errorText: {
    fontSize: 15,
    color: "#232230",
    fontWeight: "600",
    textAlign: "center",
  },
  backBtn: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#D4501E",
  },
  backBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  // Bottom navigation card
  navCard: {
  position: "absolute",
  left: 16,
  right: 16,
  bottom: 24,
  backgroundColor: "#fff",
  borderRadius: 20,
  paddingHorizontal: 18,
  paddingTop: 16,
  paddingBottom: 16,
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.15,
  shadowRadius: 16,
  elevation: 14,
  },

  // Rerouting banner
  reroutingBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#D4501E",
    borderRadius: 8,
    paddingVertical: 8,
    marginBottom: 12,
  },
  reroutingText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
  },

  // Summary row
  summaryRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  summaryItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: "800",
    color: "#232230",
  },
  summaryDivider: {
    width: 1,
    height: 20,
    backgroundColor: "#E0E0E0",
    marginHorizontal: 20,
  },

  // Destination info
  destInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F5F4F2",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  destText: { flex: 1 },
  destTitle: { fontSize: 15, fontWeight: "700", color: "#232230" },
  destAddress: { fontSize: 12, color: "#A09A94", marginTop: 2 },

  // Top instruction banner
  instructionBanner: {
  position: "absolute",
  left: 16,
  right: 16,
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: "#D4501E",
  paddingHorizontal: 16,
  paddingVertical: 14,
  gap: 14,
  borderRadius: 18,
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.15,
  shadowRadius: 10,
  elevation: 10,
  },
  instructionIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  instructionTextContainer: {
    flex: 1,
  },
  instructionDistance: {
    fontSize: 22,
    fontWeight: "800",
    color: "#fff",
  },
  instructionText: {
    fontSize: 15,
    fontWeight: "600",
    color: "rgba(255,255,255,0.9)",
    marginTop: 2,
    lineHeight: 20,
  },

  // Next step preview
  nextStepContainer: {
    backgroundColor: "#F5F5F5",
    borderRadius: 10,
    padding: 10,
  },
  nextStepLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#A09A94",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  nextStepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  nextStepText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: "#232230",
  },
  nextStepDist: {
    fontSize: 13,
    fontWeight: "700",
    color: "#A09A94",
  },
});
