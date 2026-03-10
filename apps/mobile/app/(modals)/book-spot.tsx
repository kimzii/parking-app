import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { hostService } from "../../src/services/hosts";
import * as reservationsService from "../../src/services/reservations";
import { walletService } from "../../src/services/wallet";

interface ParkingSpace {
  id: string;
  slotNumber: number;
  name: string | null;
  levelNumber: number | null;
  status: "AVAILABLE" | "OCCUPIED" | "DISABLED";
}

interface SpotDetail {
  id: string;
  title: string;
  address: string;
  basePricePerHour: string;
  parkingSpaces: ParkingSpace[];
}

export default function BookSpotScreen() {
  const { id: locationId } = useLocalSearchParams<{ id: string }>();
  const [spot, setSpot] = useState<SpotDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSpace, setSelectedSpace] = useState<ParkingSpace | null>(null);
  const [walletBalance, setWalletBalance] = useState<number>(0);

  // Date/Time state
  const [date, setDate] = useState(new Date());
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(() => {
    const end = new Date();
    end.setHours(end.getHours() + 2);
    return end;
  });

  // Picker visibility
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  // Fee calculation
  const [calculatedFee, setCalculatedFee] =
    useState<reservationsService.CalculateFeeResponse | null>(null);
  const [calculating, setCalculating] = useState(false);

  // Booking state
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    fetchData();
  }, [locationId]);

  useEffect(() => {
    if (selectedSpace) {
      calculateFee();
    }
  }, [selectedSpace, date, startTime, endTime]);

  const fetchData = async () => {
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
  };

  const getReservationTimes = () => {
    // Combine date with start/end times
    const start = new Date(date);
    start.setHours(startTime.getHours(), startTime.getMinutes(), 0, 0);

    const end = new Date(date);
    end.setHours(endTime.getHours(), endTime.getMinutes(), 0, 0);

    // If end time is before start time, assume next day
    if (end <= start) {
      end.setDate(end.getDate() + 1);
    }

    return { start, end };
  };

  const calculateFee = async () => {
    if (!selectedSpace) return;

    setCalculating(true);
    try {
      const { start, end } = getReservationTimes();
      const result = await reservationsService.calculateFee({
        parkingSpaceId: selectedSpace.id,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      });
      setCalculatedFee(result);
    } catch (err: any) {
      console.error("Failed to calculate fee:", err);
    } finally {
      setCalculating(false);
    }
  };

  const handleBooking = async () => {
    if (!selectedSpace || !calculatedFee) return;

    // Check wallet balance
    if (walletBalance < calculatedFee.totalAmount) {
      Alert.alert(
        "Insufficient Balance",
        `You need ₱${calculatedFee.totalAmount.toFixed(2)} but only have ₱${walletBalance.toFixed(2)}. Please top up your wallet.`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Top Up", onPress: () => router.push("/(modals)/top-up") },
        ],
      );
      return;
    }

    const { start, end } = getReservationTimes();

    // Confirm booking
    Alert.alert(
      "Confirm Reservation",
      `Book ${spot?.title}\nSlot: ${selectedSpace.name || selectedSpace.slotNumber}\nDate: ${start.toLocaleDateString()}\nTime: ${start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true })} - ${end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true })}\n\nTotal: ₱${calculatedFee.totalAmount.toFixed(2)}\n\nThis amount will be deducted from your wallet.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            setBooking(true);
            try {
              const result = await reservationsService.createReservation({
                parkingSpaceId: selectedSpace.id,
                startTime: start.toISOString(),
                endTime: end.toISOString(),
              });

              Alert.alert("Reservation Confirmed! 🎉", result.message, [
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

  const formatDate = (d: Date) =>
    d.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  const formatTime = (d: Date) =>
    d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["bottom"]}>
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
      <SafeAreaView style={styles.container} edges={["bottom"]}>
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
  const hasInsufficientBalance =
    calculatedFee && walletBalance < calculatedFee.totalAmount;

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <Stack.Screen options={{ title: "Book Parking" }} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Spot Info */}
        <View style={styles.spotInfo}>
          <Text style={styles.spotTitle}>{spot.title}</Text>
          <Text style={styles.spotAddress}>{spot.address}</Text>
          <Text style={styles.priceText}>
            ₱{Number(spot.basePricePerHour).toFixed(2)}/hour
          </Text>
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

        {/* Date & Time Selection */}
        {selectedSpace && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select Date & Time</Text>

            {/* Date Picker */}
            <TouchableOpacity
              style={styles.dateTimeBtn}
              onPress={() => setShowDatePicker(true)}
            >
              <MaterialIcons name="calendar-today" size={20} color="#11796F" />
              <View style={{ flex: 1 }}>
                <Text style={styles.dtLabel}>Date</Text>
                <Text style={styles.dtValue}>{formatDate(date)}</Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color="#8E8E93" />
            </TouchableOpacity>

            {/* Start Time */}
            <TouchableOpacity
              style={styles.dateTimeBtn}
              onPress={() => setShowStartPicker(true)}
            >
              <MaterialIcons name="schedule" size={20} color="#11796F" />
              <View style={{ flex: 1 }}>
                <Text style={styles.dtLabel}>Start Time</Text>
                <Text style={styles.dtValue}>{formatTime(startTime)}</Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color="#8E8E93" />
            </TouchableOpacity>

            {/* End Time */}
            <TouchableOpacity
              style={styles.dateTimeBtn}
              onPress={() => setShowEndPicker(true)}
            >
              <MaterialIcons name="schedule" size={20} color="#11796F" />
              <View style={{ flex: 1 }}>
                <Text style={styles.dtLabel}>End Time</Text>
                <Text style={styles.dtValue}>{formatTime(endTime)}</Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color="#8E8E93" />
            </TouchableOpacity>

            {/* Date/Time Pickers */}
            {showDatePicker && (
              <DateTimePicker
                value={date}
                mode="date"
                minimumDate={new Date()}
                onChange={(_, selected) => {
                  setShowDatePicker(Platform.OS === "ios");
                  if (selected) setDate(selected);
                }}
              />
            )}
            {showStartPicker && (
              <DateTimePicker
                value={startTime}
                mode="time"
                minuteInterval={15}
                onChange={(_, selected) => {
                  setShowStartPicker(Platform.OS === "ios");
                  if (selected) setStartTime(selected);
                }}
              />
            )}
            {showEndPicker && (
              <DateTimePicker
                value={endTime}
                mode="time"
                minuteInterval={15}
                onChange={(_, selected) => {
                  setShowEndPicker(Platform.OS === "ios");
                  if (selected) setEndTime(selected);
                }}
              />
            )}
          </View>
        )}

        {/* Fee Summary */}
        {selectedSpace && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Booking Summary</Text>
            <View style={styles.summaryCard}>
              {calculating ? (
                <ActivityIndicator size="small" color="#11796F" />
              ) : calculatedFee ? (
                <>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Duration</Text>
                    <Text style={styles.summaryValue}>
                      {calculatedFee.durationHours} hour(s)
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Rate</Text>
                    <Text style={styles.summaryValue}>
                      ₱{calculatedFee.pricePerHour.toFixed(2)}/hr
                    </Text>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.summaryRow}>
                    <Text style={styles.totalLabel}>Total</Text>
                    <Text style={styles.totalValue}>
                      ₱{calculatedFee.totalAmount.toFixed(2)}
                    </Text>
                  </View>
                </>
              ) : (
                <Text style={styles.summaryError}>Failed to calculate fee</Text>
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Book Button */}
      {selectedSpace && calculatedFee && (
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
                    : `Book for ₱${calculatedFee.totalAmount.toFixed(2)}`}
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
  priceText: { fontSize: 16, fontWeight: "700", color: "#11796F" },

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
    width: 90,
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
  slotLevel: { fontSize: 10, color: "#8E8E93" },
  slotLevelSelected: { color: "rgba(255,255,255,0.8)" },

  // Date/Time Buttons
  dateTimeBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  dtLabel: { fontSize: 12, color: "#8E8E93", fontWeight: "600" },
  dtValue: { fontSize: 15, fontWeight: "700", color: "#1A1A2E" },

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
  summaryError: { fontSize: 14, color: "#E53935", textAlign: "center" },
  divider: { height: 1, backgroundColor: "#E0E0E0", marginVertical: 10 },
  totalLabel: { fontSize: 16, fontWeight: "700", color: "#1A1A2E" },
  totalValue: { fontSize: 18, fontWeight: "800", color: "#11796F" },

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
