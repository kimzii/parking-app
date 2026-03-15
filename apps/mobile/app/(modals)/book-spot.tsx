import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { hostService } from "../../src/services/hosts";
import * as reservationsService from "../../src/services/reservations";
import { walletService } from "../../src/services/wallet";

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
  parkingSpaces: ParkingSpace[];
}

export default function BookSpotScreen() {
  const { id: locationId } = useLocalSearchParams<{ id: string }>();
  const [spot, setSpot] = useState<SpotDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSpace, setSelectedSpace] = useState<ParkingSpace | null>(null);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [booking, setBooking] = useState(false);

  const fetchData = useCallback(async () => {
    if (!locationId) return;
    try {
      const [spotData, balanceData] = await Promise.all([
        hostService.getPublicLocation(locationId),
        walletService.getBalance(),
      ]);
      setSpot(spotData);
      setWalletBalance(Number(balanceData.balance));
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

  const firstHourFee = spot ? Number(spot.basePricePerHour) : 0;
  const hasInsufficientBalance =
    firstHourFee > 0 && walletBalance < firstHourFee;

  const handleBooking = async () => {
    if (!selectedSpace || !spot) return;

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

    Alert.alert(
      "Confirm Booking",
      `Book ${spot.title}\nSlot: ${selectedSpace.name || `Slot ${selectedSpace.slotNumber}`}\n\nFirst hour fee: ₱${firstHourFee.toFixed(2)}\nRate: ₱${firstHourFee.toFixed(2)}/hr (pay-as-you-go)\n\nHost has 5 minutes to approve your request.\nOnce approved, you have 60 minutes to arrive.\nThis amount will be deducted from your wallet.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm & Pay",
          onPress: async () => {
            setBooking(true);
            try {
              const result = await reservationsService.createReservation({
                parkingSpaceId: selectedSpace.id,
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
      <SafeAreaView style={styles.container} edges={["top", "left", "right", "bottom"]}>
        <Stack.Screen options={{ title: "Book Parking" }} />
        <ActivityIndicator
          size="large"
          color="#11796F"
          style={{ marginTop: 60 }}
        />
      </SafeAreaView>
    );
  }

  if (!spot) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "left", "right", "bottom"]}>
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

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right", "bottom"]}>
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
              <MaterialIcons name="timer" size={14} color="#11796F" />
              <Text style={styles.payAsYouGoText}>Pay-as-you-go</Text>
            </View>
          </View>
          {!spot.is24Hours && spot.openTime && spot.closeTime && (
            <View style={styles.hoursRow}>
              <MaterialIcons name="access-time" size={16} color="#8E8E93" />
              <Text style={styles.hoursText}>
                Hours: {spot.openTime} - {spot.closeTime}
              </Text>
            </View>
          )}
          {spot.is24Hours && (
            <View style={styles.hoursRow}>
              <MaterialIcons name="access-time" size={16} color="#4CAF50" />
              <Text style={[styles.hoursText, { color: "#4CAF50" }]}>
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
            color={hasInsufficientBalance ? "#E53935" : "#11796F"}
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

        {/* Select Slot */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Select a Parking Slot ({availableSpaces.length} available)
          </Text>
          {availableSpaces.length === 0 ? (
            <View style={styles.noSlotsCard}>
              <MaterialIcons name="event-busy" size={32} color="#8E8E93" />
              <Text style={styles.noSlotsText}>
                No available slots at this location
              </Text>
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
                      color={isSelected ? "#fff" : "#4CAF50"}
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
                    {space.levelNumber && (
                      <Text
                        style={[
                          styles.slotLevel,
                          isSelected && styles.slotLevelSelected,
                        ]}
                      >
                        Floor {space.levelNumber}
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
                  <MaterialIcons name={step.icon} size={20} color="#11796F" />
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
              (booking || hasInsufficientBalance) && styles.bookBtnDisabled,
            ]}
            onPress={handleBooking}
            disabled={!!booking || !!hasInsufficientBalance}
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
                  {hasInsufficientBalance
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
  container: { flex: 1, backgroundColor: "#F8FAFB" },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 100 },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  errorText: { fontSize: 16, color: "#1A1A2E", fontWeight: "600" },

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
    color: "#1A1A2E",
    marginBottom: 4,
  },
  spotAddress: { fontSize: 14, color: "#8E8E93", marginBottom: 8 },
  rateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  priceText: { fontSize: 16, fontWeight: "700", color: "#11796F" },
  payAsYouGoBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#E8F5E9",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  payAsYouGoText: { fontSize: 11, fontWeight: "700", color: "#11796F" },
  hoursRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  hoursText: { fontSize: 13, color: "#8E8E93" },

  // Wallet Card
  walletCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
    gap: 12,
  },
  walletCardWarning: { backgroundColor: "#FFEBEE" },
  walletLabel: { fontSize: 12, color: "#666", fontWeight: "600" },
  walletBalance: { fontSize: 18, fontWeight: "800", color: "#11796F" },
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
    color: "#1A1A2E",
    marginBottom: 12,
  },

  // No slots
  noSlotsCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 24,
    alignItems: "center",
    gap: 8,
  },
  noSlotsText: { fontSize: 14, color: "#8E8E93", textAlign: "center" },

  // Slots Grid
  slotsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  slotCell: {
    width: 100,
    backgroundColor: "#E8F5E9",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    gap: 4,
    borderWidth: 2,
    borderColor: "#E8F5E9",
  },
  slotCellSelected: {
    backgroundColor: "#11796F",
    borderColor: "#11796F",
  },
  slotNumber: {
    fontSize: 13,
    fontWeight: "700",
    color: "#4CAF50",
    textAlign: "center",
  },
  slotNumberSelected: { color: "#fff" },
  slotDesc: { fontSize: 10, color: "#666", textAlign: "center" },
  slotDescSelected: { color: "rgba(255,255,255,0.8)" },
  slotLevel: { fontSize: 10, color: "#8E8E93" },
  slotLevelSelected: { color: "rgba(255,255,255,0.8)" },

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
  summaryLabel: { fontSize: 14, color: "#8E8E93" },
  summaryValue: { fontSize: 14, fontWeight: "600", color: "#1A1A2E" },
  divider: { height: 1, backgroundColor: "#E0E0E0", marginVertical: 10 },
  totalLabel: { fontSize: 16, fontWeight: "700", color: "#1A1A2E" },
  totalValue: { fontSize: 18, fontWeight: "800", color: "#11796F" },
  summaryNote: {
    fontSize: 12,
    color: "#8E8E93",
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
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
  },
  stepNum: { fontSize: 11, fontWeight: "700", color: "#11796F" },
  stepText: { fontSize: 13, color: "#1A1A2E", flex: 1 },

  // Footer
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    padding: 16,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
  },
  bookBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#11796F",
    borderRadius: 14,
    paddingVertical: 16,
  },
  bookBtnDisabled: { backgroundColor: "#9E9E9E" },
  bookBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
