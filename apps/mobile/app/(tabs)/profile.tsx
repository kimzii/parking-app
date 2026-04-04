import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { MaterialIcons } from "@expo/vector-icons";
import { Image } from "expo-image";

import { userService } from "../../src/services/user";
import { User } from "../../src/types/user";
import { EWallet } from "../../src/components/EWallet";
import MenuItem from "../../src/components/MenuItem";
import { getMyReservations, settleRemainingDue, Reservation } from "../../src/services/reservations";

export default function ProfileScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [infoHeight, setInfoHeight] = useState(0);
  const [pendingPayment, setPendingPayment] = useState<Reservation | null>(null);
  const [settling, setSettling] = useState(false);

  const fetchUserIfToken = useCallback(async () => {
    setLoading(true);
    const token = await SecureStore.getItemAsync("accessToken");
    if (token) {
      try {
        const [data, reservations] = await Promise.all([
          userService.getProfile(),
          getMyReservations("PAYMENT_PENDING").catch(() => [] as Reservation[]),
        ]);
        setUser(data);
        setPendingPayment(reservations.length > 0 ? reservations[0] : null);
      } catch (err) {
        console.error("Failed to fetch user profile:", err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    } else {
      setUser(null);
      setLoading(false);
    }
  }, []);

  const handleSettle = useCallback(async () => {
    if (!pendingPayment) return;
    Alert.alert(
      "Settle Outstanding Balance",
      `Pay ₱${(pendingPayment.remainingDue ?? 0).toFixed(2)} from your wallet to complete this booking?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Settle Now",
          onPress: async () => {
            setSettling(true);
            try {
              await settleRemainingDue(pendingPayment.id);
              Alert.alert("Done", "Outstanding balance settled. Booking is now complete.");
              fetchUserIfToken();
            } catch (err: any) {
              const msg: string = err?.response?.data?.message ?? "";
              if (msg.toLowerCase().includes("insufficient")) {
                router.push("/(modals)/top-up" as any);
              } else {
                Alert.alert("Failed", msg || "Could not settle payment.");
              }
            } finally {
              setSettling(false);
            }
          },
        },
      ],
    );
  }, [pendingPayment, fetchUserIfToken]);

  useFocusEffect(
    useCallback(() => {
      fetchUserIfToken();
    }, [fetchUserIfToken]),
  );

  const isDriverVerified =
    user?.roleStatuses?.find((r) => r.role === "DRIVER")?.status === "VERIFIED";

  return (
    <SafeAreaView style={styles.safeArea} edges={["left", "right"]}>
      <View style={styles.container}>
        {/* Orange header */}
        <View style={styles.profileHeader}>
          <View style={[styles.avatar, infoHeight > 0 && { height: infoHeight }]}>
            {user?.profilePicture ? (
              <Image
                source={{ uri: user.profilePicture }}
                style={StyleSheet.absoluteFillObject}
                contentFit="cover"
              />
            ) : (
              <MaterialIcons name="person" size={48} color="#fff" />
            )}
          </View>

          <View
            style={styles.profileInfo}
            onLayout={(e) => setInfoHeight(e.nativeEvent.layout.height)}
          >
            <Text style={styles.userName}>
              {loading
                ? "Loading..."
                : user
                  ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || "-"
                  : "-"}
            </Text>

            <View
              style={[
                styles.verificationBadge,
                isDriverVerified && styles.verifiedBadge,
              ]}
            >
              <MaterialIcons
                name={isDriverVerified ? "verified" : "info-outline"}
                size={14}
                color={isDriverVerified ? "#fff" : "rgba(255,255,255,0.7)"}
              />
              <Text
                style={[
                  styles.badgeText,
                  isDriverVerified && styles.verifiedText,
                ]}
              >
                {isDriverVerified ? "Verified Driver" : "Not Verified"}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.editProfileBtn}
              onPress={() => router.push("/(modals)/update-profile")}
              activeOpacity={0.8}
            >
              <MaterialIcons name="edit" size={14} color="#fff" />
              <Text style={styles.editProfileText}>Edit Profile</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* White content area */}
        <View style={styles.contentWrapper}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <EWallet
              balance={Number(user?.walletBalance ?? 0)}
              onTopUp={() =>
                isDriverVerified
                  ? router.push("/(modals)/top-up")
                  : router.push("/(modals)/driver-verification")
              }
              locked={!isDriverVerified}
              hasOutstandingBalance={pendingPayment != null}
              pendingDue={pendingPayment?.remainingDue}
              onSettleDue={handleSettle}
              settling={settling}
            />

            <View style={styles.menuSection}>
              <Text style={styles.sectionLabel}>Account</Text>
              <View style={styles.menuCard}>
                <MenuItem
                  label="My Vehicles"
                  icon="directions-car"
                  iconBg="#F5F4F2"
                  iconColor="#A09A94"
                  onPress={() => router.push("/(modals)/my-vehicles")}
                />
                <MenuItem
                  label="My Reservations"
                  icon="confirmation-number"
                  iconBg="#F5F4F2"
                  iconColor="#A09A94"
                  onPress={() => router.push("/(modals)/my-reservations")}
                />
              </View>
            </View>

            <View style={styles.menuSection}>
              <Text style={styles.sectionLabel}>App</Text>
              <View style={styles.menuCard}>
                <MenuItem
                  label="Settings"
                  icon="settings"
                  iconBg="#F5F4F2"
                  iconColor="#A09A94"
                  onPress={() => router.push("/(tabs)/settings")}
                />
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#D4501E" },
  container: { flex: 1 },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 32,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.2)",
    overflow: "hidden",
  },
  profileInfo: { flex: 1 },
  userName: {
    fontSize: 22,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -0.3,
  },
  verificationBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginTop: 6,
  },
  verifiedBadge: { backgroundColor: "rgba(255,255,255,0.25)" },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.7)",
  },
  verifiedText: { color: "#fff" },
  editProfileBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignSelf: "flex-start",
  },
  editProfileText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  contentWrapper: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  scrollContent: { padding: 20, paddingBottom: 40, gap: 16 },
  menuSection: { gap: 10 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#A09A94",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginLeft: 4,
  },
  menuCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#F0EDE8",
  },
});
