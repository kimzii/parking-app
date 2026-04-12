import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { hostService } from "../../src/services/hosts";
import * as reservationsService from "../../src/services/reservations";
import { walletService } from "../../src/services/wallet";
import { driversService } from "../../src/services/drivers";
import { useSocketEvent } from "../../src/hooks/useSocket";
import { getSocket } from "../../src/services/socket";

const VEHICLE_IMAGES: Record<string, any> = {
  CAR: require("../../assets/images/ParkUp UI/sedan_14703757.png"),
  MOTORCYCLE: require("../../assets/images/ParkUp UI/scooter_16804043.png"),
};

interface Vehicle {
  id: string;
  plateNumber?: string;
  vehicleType?: string;
  brand?: string;
  model?: string;
  color?: string;
  verificationStatus?: "PENDING" | "APPROVED" | "REJECTED";
}

interface ParkingSpace {
  id: string;
  slotNumber: number;
  name: string | null;
  description?: string | null;
  levelNumber: number | null;
  status: "AVAILABLE" | "OCCUPIED" | "DISABLED";
}

interface SpotDetail {
  id: string;
  title: string;
  address: string;
  basePricePerHour: string;
  openTime?: string;
  closeTime?: string;
  is24Hours?: boolean;
  acceptedVehicles?: string[];
  parkingSpaces: ParkingSpace[];
}

function formatTime(time: string): string {
  const [hourStr, minuteStr] = time.split(":");
  let hour = parseInt(hourStr, 10);
  const minute = minuteStr || "00";
  const period = hour >= 12 ? "PM" : "AM";
  if (hour === 0) hour = 12;
  else if (hour > 12) hour -= 12;
  return `${hour}:${minute.padStart(2, "0")} ${period}`;
}

export default function BookSpotScreen() {
  const { id: locationId } = useLocalSearchParams<{ id: string }>();
  const [spot, setSpot] = useState<SpotDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSpace, setSelectedSpace] = useState<ParkingSpace | null>(null);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [booking, setBooking] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [hasOutstandingBalance, setHasOutstandingBalance] = useState(false);

  const fetchData = useCallback(async () => {
    if (!locationId) return;
    try {
      const [spotData, balanceData, pendingReservations] = await Promise.all([
        hostService.getPublicLocation(locationId),
        walletService.getBalance(),
        reservationsService.getMyReservations("PAYMENT_PENDING").catch(() => []),
      ]);
      setSpot(spotData);
      setWalletBalance(Number(balanceData.balance));
      setHasOutstandingBalance(pendingReservations.length > 0);

      // Fetch vehicles — only APPROVED ones are usable for booking
      try {
        const vehicleData = await driversService.getVehicles();
        const all = Array.isArray(vehicleData) ? vehicleData : [];
        const approved = all.filter((v: Vehicle) => v.verificationStatus === "APPROVED");
        setVehicles(approved);
        if (approved.length === 1) setSelectedVehicle(approved[0]);
      } catch {
        // Driver may not exist yet — handled during booking
      }
    } catch (err) {
      console.error("Failed to fetch data:", err);
      Alert.alert("Error", "Failed to load parking spot details");
    } finally {
      setLoading(false);
    }
  }, [locationId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Join the location-specific socket room for real-time slot updates
  useEffect(() => {
    if (!locationId) return;
    const join = () => {
      const s = getSocket();
      if (s) { s.emit("join-location", locationId); return true; }
      return false;
    };
    if (!join()) {
      const interval = setInterval(() => { if (join()) clearInterval(interval); }, 500);
      return () => clearInterval(interval);
    }
  }, [locationId]);

  // Update wallet balance in real-time (e.g. after a top-up is approved)
  useSocketEvent("balance-update", (data: { balance: string }) => {
    setWalletBalance(parseFloat(data.balance));
  });

  // Update space statuses in real-time when another driver books or cancels
  useSocketEvent("slot-update", (data: { locationId: string; availableSlots: number; spaceId?: string; spaceStatus?: string }) => {
    if (data.locationId !== locationId) return;
    setSpot((prev) => {
      if (!prev) return prev;
      const spaces = data.spaceId
        ? prev.parkingSpaces.map((s) =>
            s.id === data.spaceId
              ? { ...s, status: data.spaceStatus as ParkingSpace["status"] }
              : s
          )
        : prev.parkingSpaces;
      return { ...prev, parkingSpaces: spaces };
    });
    // Deselect the chosen space if it just became unavailable
    if (data.spaceId && data.spaceStatus !== "AVAILABLE") {
      setSelectedSpace((prev) => (prev?.id === data.spaceId ? null : prev));
    }
  });

  const firstHourFee = spot ? Number(spot.basePricePerHour) : 0;
  const hasInsufficientBalance =
    firstHourFee > 0 && walletBalance < firstHourFee;
  const affordableHours =
    firstHourFee > 0 ? Math.floor(walletBalance / firstHourFee) : 0;
  const hasLowBalance = !hasInsufficientBalance && affordableHours === 1;

  const isVehicleIncompatible =
    !!selectedVehicle?.vehicleType &&
    !!spot?.acceptedVehicles &&
    spot.acceptedVehicles.length > 0 &&
    !spot.acceptedVehicles.includes(selectedVehicle.vehicleType);

  const ensureVehicleRegistered = async (): Promise<boolean> => {
    if (vehicles.length > 0 && selectedVehicle) {
      return true;
    }

    // Try fetching fresh in case vehicles were added/approved after initial load
    try {
      const vehicleData = await driversService.getVehicles();
      const all = Array.isArray(vehicleData) ? vehicleData : [];
      const approved = all.filter((v: Vehicle) => v.verificationStatus === "APPROVED");
      setVehicles(approved);

      if (approved.length === 1) {
        setSelectedVehicle(approved[0]);
        return true;
      }
      if (approved.length > 1 && !selectedVehicle) {
        Alert.alert(
          "Select a Vehicle",
          "Please select which vehicle you'll be using for this booking.",
        );
        return false;
      }
      if (approved.length > 0) return true;

      // Has vehicles but none approved
      if (all.length > 0) {
        Alert.alert(
          "No Approved Vehicle",
          "Your vehicle(s) are still pending verification. Please wait for admin approval before booking.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "View Vehicles",
              onPress: () => router.push("/(modals)/my-vehicles"),
            },
          ],
        );
        return false;
      }
    } catch (err: any) {
      const message = err?.response?.data?.message;
      if (
        typeof message === "string" &&
        message.toLowerCase().includes("driver profile not found")
      ) {
        Alert.alert(
          "Driver Profile Required",
          "Please complete your driver profile and add a vehicle before booking.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Become a Driver",
              onPress: () => router.push("/(modals)/become-a-driver"),
            },
          ],
        );
        return false;
      }
    }

    Alert.alert(
      "Vehicle Required",
      "Please add a vehicle first before booking a parking spot.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Add Vehicle",
          onPress: () => router.push("/(modals)/my-vehicles"),
        },
      ],
    );
    return false;
  };

  const handleBooking = async () => {
    if (!selectedSpace || !spot) return;

    const hasVehicle = await ensureVehicleRegistered();
    if (!hasVehicle) {
      return;
    }

    if (hasInsufficientBalance) {
      Alert.alert(
        "Insufficient Balance",
        `You need ₱${firstHourFee.toFixed(2)} but only have ₱${walletBalance.toFixed(2)}. Please top up your wallet.`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Top Up", onPress: () => router.push("/(modals)/top-up") },
        ],
      );
      return;
    }

    const lowBalanceWarning = hasLowBalance
      ? `\n\n⚠️ Warning: Your balance only covers 1 hour. Extra time will be charged at exit. If your wallet is empty, the booking will be marked as unpaid.`
      : "";

    Alert.alert(
      "Confirm Booking",
      `Book ${spot.title}\nSlot: ${selectedSpace.name || `Slot ${selectedSpace.slotNumber}`}\n\nFirst hour fee: ₱${firstHourFee.toFixed(2)}\nRate: ₱${firstHourFee.toFixed(2)}/hr (pay-as-you-go)\n\nHost has 5 minutes to approve your request.\nOnce approved, you have 60 minutes to arrive.\nThis amount will be deducted from your wallet.${lowBalanceWarning}`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm & Pay",
          onPress: async () => {
            setBooking(true);
            try {
              const result = await reservationsService.createReservation({
                parkingSpaceId: selectedSpace.id,
                ...(selectedVehicle && { vehicleId: selectedVehicle.id }),
              });

              Alert.alert("Booking Requested", result.message, [
                {
                  text: "View QR Code",
                  onPress: () =>
                    router.replace({
                      pathname: "/(modals)/reservation-qr",
                      params: { id: result.id },
                    }),
                },
              ]);
            } catch (err: any) {
              const message =
                err.response?.data?.message || "Failed to create reservation";

              if (
                typeof message === "string" &&
                message.toLowerCase().includes("vehicle")
              ) {
                Alert.alert("Vehicle Required", message, [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Add Vehicle",
                    onPress: () => router.push("/(modals)/my-vehicles"),
                  },
                ]);
                return;
              }

              Alert.alert("Booking Failed", message);
            } finally {
              setBooking(false);
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <SafeAreaView
        style={styles.container}
        edges={["left", "right", "bottom"]}
      >
        <Stack.Screen options={{ title: "Book Parking" }} />
        <ActivityIndicator
          size="large"
          color="#D4501E"
          style={{ marginTop: 60 }}
        />
      </SafeAreaView>
    );
  }

  if (!spot) {
    return (
      <SafeAreaView
        style={styles.container}
        edges={["left", "right", "bottom"]}
      >
        <Stack.Screen options={{ title: "Book Parking" }} />
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={48} color="#E53935" />
          <Text style={styles.errorText}>Failed to load parking spot</Text>
        </View>
      </SafeAreaView>
    );
  }

  const availableSpaces = spot.parkingSpaces.filter(
    (s) => s.status === "AVAILABLE",
  );
  const occupiedCount = spot.parkingSpaces.filter(
    (s) => s.status === "OCCUPIED",
  ).length;

  const hasLevels = spot.parkingSpaces.some((s) => s.levelNumber != null);

  return (
    <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
      <Stack.Screen options={{ title: "Book Parking" }} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Spot Info */}
        <View style={styles.spotInfo}>
          <Text style={styles.spotTitle}>{spot.title}</Text>
          <Text style={styles.spotAddress}>{spot.address}</Text>
          <View style={styles.rateRow}>
            <Text style={styles.priceText}>
              ₱{Number(spot.basePricePerHour).toFixed(2)}/hour
            </Text>
            <View style={styles.payAsYouGoBadge}>
              <MaterialIcons name="timer" size={14} color="#D4501E" />
              <Text style={styles.payAsYouGoText}>Pay-as-you-go</Text>
            </View>
          </View>
          {!spot.is24Hours && spot.openTime && spot.closeTime && (
            <View style={styles.hoursRow}>
              <MaterialIcons name="access-time" size={16} color="#A09A94" />
              <Text style={styles.hoursText}>
                Hours: {formatTime(spot.openTime)} - {formatTime(spot.closeTime)}
              </Text>
            </View>
          )}
          {spot.is24Hours && (
            <View style={styles.hoursRow}>
              <MaterialIcons name="access-time" size={16} color="#A09A94" />
              <Text style={[styles.hoursText, { color: "#A09A94" }]}>
                Open 24 Hours
              </Text>
            </View>
          )}
        </View>

        {/* Wallet Balance */}
        <View
          style={[
            styles.walletCard,
            hasInsufficientBalance && styles.walletCardWarning,
          ]}
        >
          <MaterialIcons
            name="account-balance-wallet"
            size={24}
            color={hasInsufficientBalance ? "#E53935" : "#D4501E"}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.walletLabel}>Wallet Balance</Text>
            <Text
              style={[
                styles.walletBalance,
                hasInsufficientBalance && styles.walletBalanceWarning,
              ]}
            >
              ₱{walletBalance.toFixed(2)}
            </Text>
          </View>
          {hasInsufficientBalance && (
            <TouchableOpacity
              style={styles.topUpBtn}
              onPress={() => router.push("/(modals)/top-up")}
            >
              <Text style={styles.topUpBtnText}>Top Up</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Low Balance Warning */}
        {hasLowBalance && (
          <View style={styles.lowBalanceBanner}>
            <MaterialIcons name="warning" size={20} color="#F57C00" />
            <View style={{ flex: 1 }}>
              <Text style={styles.lowBalanceTitle}>Balance covers 1 hour only</Text>
              <Text style={styles.lowBalanceText}>
                Your current balance (₱{walletBalance.toFixed(2)}) is only enough
                for 1 hour. If you stay longer, the extra amount will be charged
                when you exit. If your wallet is empty at that point, your booking
                will be marked as unpaid and you won't be able to make new bookings
                until you settle the balance.
              </Text>
            </View>
          </View>
        )}

        {/* Vehicle Section */}
        {vehicles.length === 1 && vehicles[0] && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Vehicle</Text>
            <View style={styles.vehicleCard}>
              <View style={styles.vehicleIconBg}>
                <Image
                  source={
                    VEHICLE_IMAGES[vehicles[0].vehicleType ?? "CAR"] ||
                    VEHICLE_IMAGES.CAR
                  }
                  style={styles.vehiclePng}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.vehicleName}>
                  {[vehicles[0].brand, vehicles[0].model]
                    .filter(Boolean)
                    .join(" ") || "Vehicle"}
                </Text>
                {vehicles[0].plateNumber && (
                  <Text style={styles.vehiclePlate}>
                    {vehicles[0].plateNumber}
                  </Text>
                )}
                {vehicles[0].color && (
                  <Text style={styles.vehicleColor}>{vehicles[0].color}</Text>
                )}
              </View>
              <MaterialIcons name="check-circle" size={22} color="#D4501E" />
            </View>
          </View>
        )}

        {vehicles.length >= 2 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select Vehicle</Text>
            {vehicles.map((v) => {
              const isSelected = selectedVehicle?.id === v.id;
              return (
                <TouchableOpacity
                  key={v.id}
                  style={[
                    styles.vehicleCard,
                    isSelected && styles.vehicleCardSelected,
                  ]}
                  onPress={() => setSelectedVehicle(v)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.vehicleIconBg,
                      isSelected && styles.vehicleIconBgSelected,
                    ]}
                  >
                    <Image
                      source={
                        VEHICLE_IMAGES[v.vehicleType ?? "CAR"] ||
                        VEHICLE_IMAGES.CAR
                      }
                      style={[
                        styles.vehiclePng,
                        isSelected && styles.vehiclePngSelected,
                      ]}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.vehicleName,
                        isSelected && styles.vehicleNameSelected,
                      ]}
                    >
                      {[v.brand, v.model].filter(Boolean).join(" ") ||
                        "Vehicle"}
                    </Text>
                    {v.plateNumber && (
                      <Text
                        style={[
                          styles.vehiclePlate,
                          isSelected && styles.vehiclePlateSelected,
                        ]}
                      >
                        {v.plateNumber}
                      </Text>
                    )}
                    {v.color && (
                      <Text
                        style={[
                          styles.vehicleColor,
                          isSelected && styles.vehicleColorSelected,
                        ]}
                      >
                        {v.color}
                      </Text>
                    )}
                  </View>
                  {isSelected && (
                    <MaterialIcons
                      name="check-circle"
                      size={22}
                      color="#fff"
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Vehicle Incompatibility Warning */}
        {isVehicleIncompatible && (
          <View style={styles.incompatibleBanner}>
            <MaterialIcons name="warning" size={20} color="#E53935" />
            <Text style={styles.incompatibleText}>
              This location does not accept{" "}
              {selectedVehicle?.vehicleType === "CAR" ? "cars" : "motorcycles"}.
              Only {spot?.acceptedVehicles?.map((v) => v === "CAR" ? "Cars" : "Motorcycles").join(", ")} allowed.
            </Text>
          </View>
        )}

        {/* Select Slot */}
        <View style={styles.section}>
          <View style={styles.slotsHeader}>
            <Text style={styles.sectionTitle}>Select a Parking Slot</Text>
            <View style={styles.slotsSummaryRow}>
              <View style={styles.slotsSummaryItem}>
                <View style={styles.slotsSummaryDotFree} />
                <Text style={styles.slotsSummaryText}>
                  {availableSpaces.length} Free
                </Text>
              </View>
              <View style={styles.slotsSummaryItem}>
                <View style={styles.slotsSummaryDotOccupied} />
                <Text style={styles.slotsSummaryText}>
                  {occupiedCount} Occupied
                </Text>
              </View>
            </View>
          </View>
          {availableSpaces.length === 0 ? (
            <View style={styles.noSlotsCard}>
              <MaterialIcons name="event-busy" size={32} color="#A09A94" />
              <Text style={styles.noSlotsText}>
                No available slots at this location
              </Text>
            </View>
          ) : hasLevels ? (
            <View style={{ gap: 16 }}>
              {(() => {
                const levelMap = new Map<number, ParkingSpace[]>();
                availableSpaces.forEach((s) => {
                  const lvl = s.levelNumber ?? 0;
                  if (!levelMap.has(lvl)) levelMap.set(lvl, []);
                  levelMap.get(lvl)!.push(s);
                });
                const sortedLevels = [...levelMap.keys()].sort((a, b) => a - b);
                return sortedLevels.map((level) => {
                  const levelSpaces = levelMap.get(level)!;
                  return (
                    <View key={level} style={{ gap: 8 }}>
                      <Text style={styles.floorLabel}>
                        Floor {level}
                      </Text>
                      <View style={styles.slotsGrid}>
                        {levelSpaces.map((space) => {
                          const isSelected = selectedSpace?.id === space.id;
                          return (
                            <TouchableOpacity
                              key={space.id}
                              style={[
                                styles.slotCell,
                                isSelected && styles.slotCellSelected,
                              ]}
                              onPress={() => setSelectedSpace(space)}
                              activeOpacity={0.7}
                            >
                              <MaterialIcons
                                name={
                                  isSelected ? "check-circle" : "event-seat"
                                }
                                size={20}
                                color={isSelected ? "#fff" : "#D4501E"}
                              />
                              <Text
                                style={[
                                  styles.slotNumber,
                                  isSelected && styles.slotNumberSelected,
                                ]}
                              >
                                {space.name || `Slot ${space.slotNumber}`}
                              </Text>
                              {space.description && (
                                <Text
                                  style={[
                                    styles.slotDesc,
                                    isSelected && styles.slotDescSelected,
                                  ]}
                                  numberOfLines={2}
                                >
                                  {space.description}
                                </Text>
                              )}
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  );
                });
              })()}
            </View>
          ) : (
            <View style={styles.slotsGrid}>
              {availableSpaces.map((space) => {
                const isSelected = selectedSpace?.id === space.id;
                return (
                  <TouchableOpacity
                    key={space.id}
                    style={[
                      styles.slotCell,
                      isSelected && styles.slotCellSelected,
                    ]}
                    onPress={() => setSelectedSpace(space)}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons
                      name={isSelected ? "check-circle" : "event-seat"}
                      size={20}
                      color={isSelected ? "#fff" : "#D4501E"}
                    />
                    <Text
                      style={[
                        styles.slotNumber,
                        isSelected && styles.slotNumberSelected,
                      ]}
                    >
                      {space.name || `Slot ${space.slotNumber}`}
                    </Text>
                    {space.description && (
                      <Text
                        style={[
                          styles.slotDesc,
                          isSelected && styles.slotDescSelected,
                        ]}
                        numberOfLines={2}
                      >
                        {space.description}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* Booking Summary */}
        {selectedSpace && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Booking Summary</Text>
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Slot</Text>
                <Text style={styles.summaryValue}>
                  {selectedSpace.name || `Slot ${selectedSpace.slotNumber}`}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Rate</Text>
                <Text style={styles.summaryValue}>
                  ₱{firstHourFee.toFixed(2)}/hr
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Host Approval</Text>
                <Text style={styles.summaryValue}>5 minutes</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Arrival Window</Text>
                <Text style={styles.summaryValue}>60 min after approval</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.summaryRow}>
                <Text style={styles.totalLabel}>First Hour (upfront)</Text>
                <Text style={styles.totalValue}>
                  ₱{firstHourFee.toFixed(2)}
                </Text>
              </View>
              <Text style={styles.summaryNote}>
                Additional hours charged at ₱{firstHourFee.toFixed(2)}/hr when
                you exit
              </Text>
            </View>
          </View>
        )}

        {/* How it Works */}
        {selectedSpace && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>How it Works</Text>
            <View style={styles.stepsCard}>
              {[
                { icon: "payment" as const, text: "Pay first hour upfront" },
                {
                  icon: "hourglass-top" as const,
                  text: "Host reviews your booking (5-minute window)",
                },
                {
                  icon: "qr-code" as const,
                  text: "After approval, show QR code to valet on arrival",
                },
                {
                  icon: "timer" as const,
                  text: "Session starts when you arrive",
                },
                {
                  icon: "exit-to-app" as const,
                  text: "Scan QR again to exit — remaining fee auto-charged",
                },
              ].map((step, i) => (
                <View key={i} style={styles.stepRow}>
                  <View style={styles.stepCircle}>
                    <Text style={styles.stepNum}>{i + 1}</Text>
                  </View>
                  <MaterialIcons name={step.icon} size={20} color="#D4501E" />
                  <Text style={styles.stepText}>{step.text}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Book Button */}
      {selectedSpace && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.bookBtn,
              (booking || hasOutstandingBalance || hasInsufficientBalance || isVehicleIncompatible) && styles.bookBtnDisabled,
            ]}
            onPress={handleBooking}
            disabled={!!booking || hasOutstandingBalance || !!hasInsufficientBalance || isVehicleIncompatible}
            activeOpacity={0.8}
          >
            {booking ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <MaterialIcons
                  name="confirmation-number"
                  size={20}
                  color="#fff"
                />
                <Text style={styles.bookBtnText}>
                  {isVehicleIncompatible
                    ? "Vehicle Not Compatible"
                    : hasOutstandingBalance
                      ? "Settle Outstanding Balance First"
                      : hasInsufficientBalance
                        ? "Insufficient Balance"
                        : `Pay ₱${firstHourFee.toFixed(2)} & Book Now`}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 100 },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  errorText: { fontSize: 16, color: "#232230", fontWeight: "600" },

  // Spot Info
  spotInfo: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  spotTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#232230",
    marginBottom: 4,
  },
  spotAddress: { fontSize: 14, color: "#A09A94", marginBottom: 8 },
  rateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  priceText: { fontSize: 16, fontWeight: "700", color: "#D4501E" },
  payAsYouGoBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  payAsYouGoText: { fontSize: 11, fontWeight: "700", color: "#D4501E" },
  hoursRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  hoursText: { fontSize: 13, color: "#A09A94" },

  // Wallet Card
  walletCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
    gap: 12,
  },
  walletCardWarning: { backgroundColor: "#FFEBEE" },
  walletLabel: { fontSize: 12, color: "#666", fontWeight: "600" },
  walletBalance: { fontSize: 18, fontWeight: "800", color: "#D4501E" },
  walletBalanceWarning: { color: "#E53935" },
  topUpBtn: {
    backgroundColor: "#E53935",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  topUpBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },

  // Section
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#232230",
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: "#A09A94",
    marginTop: -8,
    marginBottom: 8,
  },

  // No slots
  noSlotsCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 24,
    alignItems: "center",
    gap: 8,
  },
  noSlotsText: { fontSize: 14, color: "#A09A94", textAlign: "center" },

  // Slots Grid
  slotsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  slotsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  slotsSummaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  slotsSummaryItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  slotsSummaryText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#A09A94",
  },
  slotsSummaryDotFree: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#4CAF50",
  },
  slotsSummaryDotOccupied: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#D4501E",
  },
  slotCell: {
    width: 100,
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    gap: 4,
    borderWidth: 2,
    borderColor: "#F5F5F5",
  },
  slotCellSelected: {
    backgroundColor: "#D4501E",
    borderColor: "#D4501E",
  },
  slotNumber: {
    fontSize: 13,
    fontWeight: "700",
    color: "#232230",
    textAlign: "center",
  },
  slotNumberSelected: { color: "#fff" },
  slotDesc: { fontSize: 10, color: "#666", textAlign: "center" },
  slotDescSelected: { color: "rgba(255,255,255,0.8)" },
  slotLevel: { fontSize: 10, color: "#A09A94" },
  slotLevelSelected: { color: "rgba(255,255,255,0.8)" },
  floorLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#232230",
    marginLeft: 4,
  },

  // Summary Card
  summaryCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  summaryLabel: { fontSize: 14, color: "#A09A94" },
  summaryValue: { fontSize: 14, fontWeight: "600", color: "#232230" },
  divider: { height: 1, backgroundColor: "#E0E0E0", marginVertical: 10 },
  totalLabel: { fontSize: 16, fontWeight: "700", color: "#232230" },
  totalValue: { fontSize: 18, fontWeight: "800", color: "#D4501E" },
  summaryNote: {
    fontSize: 12,
    color: "#A09A94",
    marginTop: 8,
    fontStyle: "italic",
  },

  // Steps Card
  stepsCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    gap: 14,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  stepCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
  },
  stepNum: { fontSize: 11, fontWeight: "700", color: "#D4501E" },
  stepText: { fontSize: 13, color: "#232230", flex: 1 },

  // Footer
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    padding: 16,
    paddingBottom: 60,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
  },
  bookBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#D4501E",
    borderRadius: 14,
    paddingVertical: 16,
  },
  bookBtnDisabled: { backgroundColor: "#9E9E9E" },
  bookBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  // Vehicle
  vehicleCard: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    gap: 12,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: "#FFF0EC",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  vehicleCardSelected: {
    backgroundColor: "#D4501E",
    borderColor: "#D4501E",
  },
  vehicleIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#FFF0EC",
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  vehicleIconBgSelected: {
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  vehiclePng: {
    width: 28,
    height: 28,
  },
  vehiclePngSelected: {},
  vehicleName: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: "#232230",
  },
  vehicleNameSelected: {
    color: "#fff",
  },
  vehiclePlate: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: "#A09A94",
    marginTop: 2,
  },
  vehiclePlateSelected: {
    color: "rgba(255,255,255,0.85)",
  },
  vehicleColor: {
    fontSize: 12,
    color: "#A09A94",
    marginTop: 1,
  },
  vehicleColorSelected: {
    color: "rgba(255,255,255,0.7)",
  },
  incompatibleBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFEBEE",
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: "#E53935",
  },
  incompatibleText: {
    flex: 1,
    fontSize: 13,
    color: "#E53935",
    fontWeight: "600",
    lineHeight: 18,
  },
  lowBalanceBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#FFF8E1",
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: "#F57C00",
  },
  lowBalanceTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#E65100",
    marginBottom: 4,
  },
  lowBalanceText: {
    fontSize: 12,
    color: "#BF360C",
    lineHeight: 18,
  },
});
