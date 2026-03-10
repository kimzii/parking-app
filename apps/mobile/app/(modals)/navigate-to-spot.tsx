import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import * as Location from "expo-location";

const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

interface DirectionsInfo {
  distance: string;
  duration: string;
  routeCoords: { latitude: number; longitude: number }[];
  steps: { instruction: string; distance: string }[];
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

export default function NavigateToSpotScreen() {
  const { lat, lng, title, address } = useLocalSearchParams<{
    lat: string;
    lng: string;
    title: string;
    address: string;
  }>();

  const destLat = parseFloat(lat || "0");
  const destLng = parseFloat(lng || "0");

  const mapRef = useRef<MapView>(null);
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [directions, setDirections] = useState<DirectionsInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Get user location
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setError("Location permission is required for navigation");
          setLoading(false);
          return;
        }
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        setUserLocation({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
      } catch {
        setError("Failed to get your location");
        setLoading(false);
      }
    })();
  }, []);

  // Fetch directions once we have user location
  useEffect(() => {
    if (!userLocation || !GOOGLE_MAPS_API_KEY) {
      if (userLocation && !GOOGLE_MAPS_API_KEY) {
        setError("Maps API key not configured");
        setLoading(false);
      }
      return;
    }

    const fetchDirections = async () => {
      try {
        const origin = `${userLocation.latitude},${userLocation.longitude}`;
        const destination = `${destLat},${destLng}`;
        const res = await fetch(
          `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&mode=driving&key=${GOOGLE_MAPS_API_KEY}`,
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
            }) => ({
              instruction: stripHtml(step.html_instructions),
              distance: step.distance.text,
            }),
          );

          setDirections({
            distance: leg.distance.text,
            duration: leg.duration.text,
            routeCoords,
            steps,
          });

          // Fit map to route
          setTimeout(() => {
            if (mapRef.current && routeCoords.length > 0) {
              mapRef.current.fitToCoordinates(
                [
                  userLocation,
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
      }
    };

    fetchDirections();
  }, [userLocation, destLat, destLng]);

  const handleRecenter = () => {
    if (!mapRef.current || !userLocation || !directions) return;
    mapRef.current.fitToCoordinates(
      [userLocation, { latitude: destLat, longitude: destLng }],
      {
        edgePadding: { top: 80, right: 60, bottom: 200, left: 60 },
        animated: true,
      },
    );
  };

  const nextStep = () => {
    if (directions && currentStepIndex < directions.steps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <Stack.Screen
        options={{
          title: "Navigation",
          headerRight: () =>
            directions ? (
              <TouchableOpacity
                onPress={handleRecenter}
                style={{ marginRight: 8 }}
              >
                <MaterialIcons name="my-location" size={24} color="#11796F" />
              </TouchableOpacity>
            ) : null,
        }}
      />

      {/* Map */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
          showsUserLocation
          showsMyLocationButton={false}
          initialRegion={{
            latitude: destLat,
            longitude: destLng,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
        >
          {/* Destination marker */}
          <Marker
            coordinate={{ latitude: destLat, longitude: destLng }}
            title={title || "Parking Location"}
            description={address || ""}
          >
            <View style={styles.destMarker}>
              <MaterialIcons name="local-parking" size={20} color="#fff" />
            </View>
          </Marker>

          {/* Route polyline */}
          {directions && directions.routeCoords.length > 0 && (
            <Polyline
              coordinates={directions.routeCoords}
              strokeColor="#11796F"
              strokeWidth={5}
            />
          )}
        </MapView>

        {/* Loading overlay */}
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#11796F" />
            <Text style={styles.loadingText}>Calculating route...</Text>
          </View>
        )}

        {/* Error overlay */}
        {error && (
          <View style={styles.errorOverlay}>
            <MaterialIcons name="error-outline" size={36} color="#E53935" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => router.back()}
            >
              <Text style={styles.backBtnText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Bottom navigation card */}
      {directions && !error && (
        <View style={styles.navCard}>
          {/* Summary row */}
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <MaterialIcons name="schedule" size={18} color="#11796F" />
              <Text style={styles.summaryValue}>{directions.duration}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <MaterialIcons name="straighten" size={18} color="#11796F" />
              <Text style={styles.summaryValue}>{directions.distance}</Text>
            </View>
          </View>

          {/* Destination info */}
          <View style={styles.destInfo}>
            <MaterialIcons name="local-parking" size={20} color="#11796F" />
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

          {/* Turn-by-turn step */}
          {directions.steps.length > 0 && (
            <View style={styles.stepContainer}>
              <View style={styles.stepHeader}>
                <MaterialIcons name="navigation" size={18} color="#fff" />
                <Text style={styles.stepCounter}>
                  Step {currentStepIndex + 1} of {directions.steps.length}
                </Text>
              </View>
              <Text style={styles.stepInstruction} numberOfLines={2}>
                {directions.steps[currentStepIndex].instruction}
              </Text>
              <Text style={styles.stepDistance}>
                {directions.steps[currentStepIndex].distance}
              </Text>
              <View style={styles.stepNav}>
                <TouchableOpacity
                  onPress={prevStep}
                  disabled={currentStepIndex === 0}
                  style={[
                    styles.stepNavBtn,
                    currentStepIndex === 0 && styles.stepNavBtnDisabled,
                  ]}
                >
                  <MaterialIcons
                    name="chevron-left"
                    size={24}
                    color={currentStepIndex === 0 ? "#ccc" : "#11796F"}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={nextStep}
                  disabled={currentStepIndex === directions.steps.length - 1}
                  style={[
                    styles.stepNavBtn,
                    currentStepIndex === directions.steps.length - 1 &&
                      styles.stepNavBtnDisabled,
                  ]}
                >
                  <MaterialIcons
                    name="chevron-right"
                    size={24}
                    color={
                      currentStepIndex === directions.steps.length - 1
                        ? "#ccc"
                        : "#11796F"
                    }
                  />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFB" },
  mapContainer: { flex: 1, position: "relative" },
  map: { flex: 1 },

  // Destination marker
  destMarker: {
    backgroundColor: "#11796F",
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
  loadingText: { fontSize: 15, color: "#1A1A2E", fontWeight: "600" },
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
    color: "#1A1A2E",
    fontWeight: "600",
    textAlign: "center",
  },
  backBtn: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#11796F",
  },
  backBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  // Bottom navigation card
  navCard: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
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
    color: "#1A1A2E",
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
    backgroundColor: "#F0FAF9",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  destText: { flex: 1 },
  destTitle: { fontSize: 15, fontWeight: "700", color: "#1A1A2E" },
  destAddress: { fontSize: 12, color: "#8E8E93", marginTop: 2 },

  // Step-by-step
  stepContainer: {
    backgroundColor: "#11796F",
    borderRadius: 12,
    padding: 14,
  },
  stepHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  stepCounter: {
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(255,255,255,0.7)",
  },
  stepInstruction: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
    lineHeight: 20,
  },
  stepDistance: {
    fontSize: 13,
    color: "rgba(255,255,255,0.7)",
    marginTop: 4,
  },
  stepNav: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 8,
  },
  stepNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  stepNavBtnDisabled: { opacity: 0.5 },
});
