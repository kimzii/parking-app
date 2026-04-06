import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Image,
  Alert,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { userService } from "../../src/services/user";
import * as reservationsService from "../../src/services/reservations";
import { getUnreadCount } from "../../src/services/notifications";
import { useSocketEvent } from "../../src/hooks/useSocket";

const STATUS_CONFIG: Record<
  string,
  { color: string; bg: string; label: string; icon: string }
> = {
  PENDING: {
    color: "#D4501E",
    bg: "#FFF0EC",
    label: "Pending Approval",
    icon: "hourglass-top",
  },
  CONFIRMED: {
  color: "#D4501E",
  bg: "#FFF0EC",
    label: "Confirmed",
  icon: "directions-car",
  },
  ACTIVE: {
    color: "#D4501E",
    bg: "#F5F4F2",
    label: "Active",
    icon: "directions-car",
  },
  COMPLETED: {
  color: "#A09A94",
  bg: "#F5F5F5",
    label: "Completed",
    icon: "done-all",
  },
  CANCELLED: {
    color: "#E53935",
    bg: "#FFEBEE",
    label: "Cancelled",
    icon: "cancel",
  },
  EXPIRED: {
    color: "#9E9E9E",
    bg: "#F5F5F5",
    label: "Expired",
    icon: "timer-off",
  },
};

function formatCountdown(ms: number): string {
  if (ms <= 0) return "Expired";
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  return `${mins}m ${secs.toString().padStart(2, "0")}s`;
}

const DAYS_OF_WEEK = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

function CalendarPicker({
  value,
  onChange,
}: {
  value: Date;
  onChange: (d: Date) => void;
}) {
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  const [viewYear, setViewYear] = useState(value.getFullYear());
  const [viewMonth, setViewMonth] = useState(value.getMonth());

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    const next = new Date(viewYear, viewMonth + 1, 1);
    if (next > today) return;
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null);

  const isSelected = (day: number) =>
    value.getFullYear() === viewYear &&
    value.getMonth() === viewMonth &&
    value.getDate() === day;

  const isToday = (day: number) => {
    const t = new Date();
    return t.getFullYear() === viewYear && t.getMonth() === viewMonth && t.getDate() === day;
  };

  const isFuture = (day: number) => new Date(viewYear, viewMonth, day) > today;

  const isNextMonthFuture = new Date(viewYear, viewMonth + 1, 1) > today;

  return (
    <View style={calStyles.container}>
      {/* Month nav */}
      <View style={calStyles.navRow}>
        <TouchableOpacity onPress={prevMonth} style={calStyles.navBtn}>
          <MaterialIcons name="chevron-left" size={24} color="#232230" />
        </TouchableOpacity>
        <Text style={calStyles.monthLabel}>
          {MONTHS[viewMonth]} {viewYear}
        </Text>
        <TouchableOpacity
          onPress={nextMonth}
          style={calStyles.navBtn}
          disabled={isNextMonthFuture}
        >
          <MaterialIcons
            name="chevron-right"
            size={24}
            color={isNextMonthFuture ? "#D0D0D0" : "#232230"}
          />
        </TouchableOpacity>
      </View>

      {/* Day headers */}
      <View style={calStyles.row}>
        {DAYS_OF_WEEK.map(d => (
          <Text key={d} style={calStyles.dayHeader}>{d}</Text>
        ))}
      </View>

      {/* Day grid */}
      {Array.from({ length: cells.length / 7 }, (_, row) => (
        <View key={row} style={calStyles.row}>
          {cells.slice(row * 7, row * 7 + 7).map((day, col) => {
            if (!day) return <View key={col} style={calStyles.dayCell} />;
            const future = isFuture(day);
            const selected = isSelected(day);
            const todayCell = isToday(day);
            return (
              <TouchableOpacity
                key={col}
                style={[
                  calStyles.dayCell,
                  selected && calStyles.dayCellSelected,
                  todayCell && !selected && calStyles.dayCellToday,
                ]}
                onPress={() => {
                  if (!future) onChange(new Date(viewYear, viewMonth, day));
                }}
                disabled={future}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    calStyles.dayText,
                    selected && calStyles.dayTextSelected,
                    future && calStyles.dayTextFuture,
                    todayCell && !selected && calStyles.dayTextToday,
                  ]}
                >
                  {day}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const calStyles = StyleSheet.create({
  container: { width: "100%", gap: 4 },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  navBtn: { padding: 4 },
  monthLabel: { fontSize: 15, fontWeight: "700", color: "#232230" },
  row: { flexDirection: "row" },
  dayHeader: {
    flex: 1,
    textAlign: "center",
    fontSize: 11,
    fontWeight: "700",
    color: "#A09A94",
    paddingBottom: 4,
  },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
  },
  dayCellSelected: { backgroundColor: "#D4501E" },
  dayCellToday: { backgroundColor: "#FFF0EC" },
  dayText: { fontSize: 13, fontWeight: "600", color: "#232230" },
  dayTextSelected: { color: "#fff" },
  dayTextFuture: { color: "#D0D0D0" },
  dayTextToday: { color: "#D4501E" },
});

const FILTERS = [
  { key: "all", label: "All" },
  { key: "Upcoming", label: "Upcoming" },
  { key: "Active", label: "Active" },
  { key: "Past", label: "Past" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

export default function HostHomeScreen() {
  const [userName, setUserName] = useState("");
  const [loading, setLoading] = useState(true);
  const [reservations, setReservations] = useState<
    reservationsService.HostReservation[]
  >([]);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(new Date());
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(new Date());

  // Real-time: bump unread badge when a new notification arrives
  useSocketEvent("notification", () => {
    setUnreadCount((prev) => prev + 1);
  });

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  })();

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchReservations = useCallback(async (status?: string) => {
    try {
      const mapped = status === "all" || !status ? undefined : status;
      const data = await reservationsService.getHostReservations(
        undefined,
        mapped,
      );
      setReservations(data);
    } catch (err) {
      console.error("Failed to fetch reservations:", err);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      const fetchData = async () => {
        setLoading(true);
        try {
          const [profile] = await Promise.all([
            userService.getProfile(),
            getUnreadCount()
              .then((c) => setUnreadCount(c))
              .catch(() => {}),
          ]);
          setUserName(
            `${profile.firstName ?? ""} ${profile.lastName ?? ""}`.trim() ||
              "Host",
          );
          await fetchReservations(filter);
        } catch (err) {
          console.error("Failed to fetch host data:", err);
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }, [filter, fetchReservations]),
  );

  useFocusEffect(
    useCallback(() => {
      const interval = setInterval(() => {
        void fetchReservations(filter);
      }, 15 * 1000);

      return () => clearInterval(interval);
    }, [filter, fetchReservations]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchReservations(filter);
    setRefreshing(false);
  }, [filter, fetchReservations]);

  const handleApprove = useCallback(
    (id: string) => {
      Alert.alert("Approve Booking", "Approve this booking request?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Approve",
          onPress: async () => {
            try {
              await reservationsService.approveReservation(id);
              await fetchReservations(filter);
            } catch (err: any) {
              Alert.alert(
                "Approval Failed",
                err.response?.data?.message || "Failed to approve reservation",
              );
            }
          },
        },
      ]);
    },
    [filter, fetchReservations],
  );

  const handleReject = useCallback(
    (id: string) => {
      Alert.alert(
        "Reject Booking",
        "Reject this booking request? The driver will be refunded.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Reject",
            style: "destructive",
            onPress: async () => {
              try {
                await reservationsService.rejectReservation(id);
                await fetchReservations(filter);
              } catch (err: any) {
                Alert.alert(
                  "Rejection Failed",
                  err.response?.data?.message || "Failed to reject reservation",
                );
              }
            },
          },
        ],
      );
    },
    [filter, fetchReservations],
  );

  const renderReservationItem = ({
    item,
  }: {
    item: reservationsService.HostReservation;
  }) => {
    const status = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.CONFIRMED;
    const pendingRemainingMs =
      item.status === "PENDING" && item.arrivalDeadline
        ? new Date(item.arrivalDeadline).getTime() - now.getTime()
        : null;
    const driverPhone = item.driver?.phone || "Not provided";
    const driverPlateNumber =
      item.driver?.vehicle?.plateNumber || "Not provided";
    const slotName = item.parkingSpace.name?.trim() || "Unnamed Spot";
    const bookedSpot = slotName;
    const vehicleLabel = [
      item.driver?.vehicle?.brand,
      item.driver?.vehicle?.model,
    ]
      .filter(Boolean)
      .join(" ")
      .trim();
    const vehicleText = item.driver?.vehicle
      ? vehicleLabel || item.driver.vehicle.vehicleType || "Vehicle"
      : "Not provided";

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() =>
          router.push({
            pathname: "/(modals)/host-reservation-detail",
            params: { reservation: JSON.stringify(item) },
          } as any)
        }
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <Text style={styles.cardLocation}>
              {item.parkingLocation.title}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
              <MaterialIcons
                name={status.icon as any}
                size={12}
                color={status.color}
              />
              <Text style={[styles.statusText, { color: status.color }]}>
                {status.label}
              </Text>
            </View>
          </View>
          <View style={styles.slotBadge}>
            <Text style={styles.slotText}>{slotName}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Driver Info */}
        <View style={styles.driverRow}>
          {item.driver?.image ? (
            <Image
              source={{ uri: item.driver.image }}
              style={styles.driverAvatar}
            />
          ) : (
            <View style={styles.driverAvatarPlaceholder}>
              <MaterialIcons name="person" size={18} color="#C7C7CC" />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.driverName}>
              {item.driver?.name || "Driver"}
            </Text>
            <View style={styles.driverMetaRow}>
              <MaterialIcons name="phone" size={12} color="#A09A94" />
              <Text style={styles.driverMetaText} numberOfLines={1}>Phone: {driverPhone}</Text>
            </View>
            <View style={styles.driverMetaRow}>
              <MaterialIcons
                name="confirmation-number"
                size={12}
                color="#A09A94"
              />
              <Text style={styles.driverMetaText} numberOfLines={1}>
                Plate Number: {driverPlateNumber}
              </Text>
            </View>
            <View style={styles.driverMetaRow}>
              <MaterialIcons name="directions-car" size={12} color="#A09A94" />
              <Text style={styles.driverMetaText} numberOfLines={1}>Vehicle: {vehicleText}</Text>
            </View>
            <View style={styles.driverMetaRow}>
              <MaterialIcons name="local-parking" size={12} color="#A09A94" />
              <Text style={styles.driverMetaText} numberOfLines={1}>
                Booked Spot: {bookedSpot}
              </Text>
            </View>
          </View>
          <MaterialIcons name="chevron-right" size={22} color="#C7C7CC" />
        </View>

        {/* Time Info */}
        <View style={styles.timeSection}>
          {item.status === "PENDING" && item.arrivalDeadline && (
            <View style={styles.timeItem}>
              <MaterialIcons name="schedule" size={16} color="#A09A94" />
              <Text style={styles.timeText}>
                Approve in {formatCountdown(pendingRemainingMs ?? 0)}
              </Text>
            </View>
          )}
          {item.status === "PENDING" && item.arrivalDeadline && (
            <View style={styles.timeItem}>
              <MaterialIcons name="hourglass-empty" size={16} color="#D4501E" />
              <Text style={[styles.timeText, { color: "#D4501E" }]}>
                Decision deadline{" "}
                {new Date(item.arrivalDeadline).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                })}
              </Text>
            </View>
          )}
          {item.status === "CONFIRMED" && item.arrivalDeadline && (
            <View style={styles.timeItem}>
              <MaterialIcons name="schedule" size={16} color="#D4501E" />
              <Text style={[styles.timeText, { color: "#D4501E" }]}>
                Driver arrives by{" "}
                {new Date(item.arrivalDeadline).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                })}
              </Text>
            </View>
          )}
          {item.sessionStartedAt && (
            <View style={styles.timeItem}>
              <MaterialIcons name="login" size={16} color="#D4501E" />
              <Text style={[styles.timeText, { color: "#D4501E" }]}>
                Checked in:{" "}
                {new Date(item.sessionStartedAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                })}
              </Text>
            </View>
          )}
          {item.sessionEndedAt && (
            <View style={styles.timeItem}>
              <MaterialIcons name="logout" size={16} color="#A09A94" />
              <Text style={[styles.timeText, { color: "#A09A94" }]}>
                Checked out:{" "}
                {new Date(item.sessionEndedAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                })}
              </Text>
            </View>
          )}
          {/* {item.status === "ACTIVE" && !item.sessionEndedAt && (
            <View style={styles.timeItem}>
              <MaterialIcons name="timer" size={16} color="#D4501E" />
              <Text style={[styles.timeText, { color: "#D4501E" }]}>
                Session in progress — Pay-as-you-go
              </Text>
            </View>
          )} */}
        </View>

        {/* Amount */}
        <View style={styles.amountRow}>
          <Text style={styles.amountLabel}>Amount</Text>
          <Text style={styles.amountValue}>
            ₱{Number(item.finalAmount || item.totalAmount).toFixed(2)}
          </Text>
          {item.overtimeAmount && Number(item.overtimeAmount) > 0 && (
            <Text style={styles.overtimeText}>
              (+₱{Number(item.overtimeAmount).toFixed(2)} overtime)
            </Text>
          )}
        </View>

        {item.status === "PENDING" && (pendingRemainingMs ?? 0) > 0 && (
          <View style={styles.actionBtns}>
            <TouchableOpacity
              style={styles.rejectBtn}
              onPress={() => handleReject(item.id)}
              activeOpacity={0.8}
            >
              <MaterialIcons name="close" size={18} color="#E53935" />
              <Text style={styles.rejectBtnText}>Reject</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={() => handleApprove(item.id)}
              activeOpacity={0.8}
            >
              <MaterialIcons name="check" size={18} color="#fff" />
              <Text style={styles.confirmBtnText}>Approve</Text>
            </TouchableOpacity>
          </View>
        )}
        {item.status === "PENDING" && (pendingRemainingMs ?? 0) <= 0 && (
          <Text style={styles.overtimeText}>
            Approval window expired. Pull to refresh.
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  const filteredReservations = selectedDate
    ? reservations.filter((r) => {
        const date = new Date(r.createdAt);
        return (
          date.getFullYear() === selectedDate.getFullYear() &&
          date.getMonth() === selectedDate.getMonth() &&
          date.getDate() === selectedDate.getDate()
        );
      })
    : reservations;

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialIcons name="event-note" size={64} color="#C7C7CC" />
      <Text style={styles.emptyTitle}>No reservations</Text>
      <Text style={styles.emptyText}>
        Reservations for your parking spaces will appear here
      </Text>
    </View>
  );

  const stickyFilters = (
    <View style={styles.stickyFilterSection}>
      {/* Reservations Section Title */}
      <Text style={styles.sectionTitle}>Reservations</Text>

      {/* Status Filters */}
      <View style={styles.filterRow}>
        <View style={styles.filters}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[
                styles.filterBtn,
                filter === f.key && styles.filterBtnActive,
              ]}
              onPress={() => {
                setFilter(f.key);
                setLoading(true);
              }}
            >
              <Text
                style={[
                  styles.filterText,
                  filter === f.key && styles.filterTextActive,
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Date Filter Button */}
        <TouchableOpacity
          style={[styles.dateBtn, selectedDate != null && styles.dateBtnActive]}
          onPress={() => {
            setTempDate(selectedDate ?? new Date());
            setShowDatePicker(true);
          }}
          activeOpacity={0.8}
        >
          <MaterialIcons
            name="calendar-today"
            size={16}
            color={selectedDate != null ? "#fff" : "#D4501E"}
          />
          {selectedDate != null && (
            <Text style={styles.dateBtnText}>
              {selectedDate.toLocaleDateString("en-PH", {
                month: "short",
                day: "numeric",
              })}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Active date badge + clear */}
      {selectedDate != null && (
        <View style={styles.activeDateRow}>
          <MaterialIcons name="filter-list" size={14} color="#D4501E" />
          <Text style={styles.activeDateText}>
            Showing:{" "}
            {selectedDate.toLocaleDateString("en-PH", {
              weekday: "short",
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </Text>
          <TouchableOpacity onPress={() => setSelectedDate(null)}>
            <MaterialIcons name="close" size={16} color="#A09A94" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greetingText}>{greeting}</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.hostBadge}>
            <MaterialIcons name="home-work" size={16} color="#D4501E" />
            <Text style={styles.hostBadgeText}>Host</Text>
          </View>
          <TouchableOpacity
            style={styles.notifBtn}
            onPress={() => router.push("/(modals)/notifications" as any)}
            activeOpacity={0.75}
          >
            <MaterialIcons name="notifications" size={22} color="#D4501E" />
            {unreadCount > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>
                  {unreadCount > 9 ? "9+" : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {stickyFilters}

      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator
            size="large"
            color="#D4501E"
            style={{ marginTop: 40 }}
          />
        ) : (
          <FlatList
            data={filteredReservations}
            keyExtractor={(item) => item.id}
            renderItem={renderReservationItem}
            ListEmptyComponent={renderEmptyState}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#D4501E"
              />
            }
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* Floating Scan QR FAB */}
      <TouchableOpacity
        style={styles.scanFab}
        onPress={() => router.push("/(modals)/scan-qr")}
        activeOpacity={0.8}
      >
        <MaterialIcons name="qr-code-scanner" size={26} color="#fff" />
      </TouchableOpacity>

      <Modal
        visible={showDatePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View style={styles.dateModalOverlay}>
          <View style={styles.dateModalCard}>
            <Text style={styles.dateModalTitle}>Select Date</Text>
            <CalendarPicker
              value={tempDate}
              onChange={setTempDate}
            />
            <View style={styles.dateModalBtns}>
              <TouchableOpacity
                style={styles.dateModalCancel}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={styles.dateModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dateModalConfirm}
                onPress={() => {
                  setSelectedDate(tempDate);
                  setShowDatePicker(false);
                }}
              >
                <Text style={styles.dateModalConfirmText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#FFFFFF" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: "#FFFFFF",
  },
  greetingText: {
    fontSize: 22,
    fontWeight: "700",
    color: "#232230",
    letterSpacing: -0.3,
    paddingTop: 8,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  notifBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F5F4F2",
    justifyContent: "center",
    alignItems: "center",
  },
  hostBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    width: 65,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F5F4F2",
  },
  hostBadgeText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#D4501E",
  },
  stickyFilterSection: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0EDE8",
    zIndex: 1,
  },
  content: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  listContent: {
    padding: 20,
    paddingBottom: 40,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#A09A94",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginLeft: 4,
    marginTop: 12,
    marginBottom: 8,
  },

  // Scan QR
  scanFab: {
    position: "absolute",
    bottom: 24,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 14,
    backgroundColor: "#D4501E",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#D4501E",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },

  // Filters
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  filters: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  dateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#FFF0EC",
    borderWidth: 1,
    borderColor: "#D4501E",
  },
  dateBtnActive: {
    backgroundColor: "#D4501E",
    borderColor: "#D4501E",
  },
  dateBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fff",
  },
  activeDateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFF0EC",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 8,
  },
  activeDateText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    color: "#D4501E",
  },
  dateModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  dateModalCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    width: "100%",
    alignItems: "center",
    gap: 16,
  },
  dateModalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#232230",
    alignSelf: "flex-start",
  },
  dateModalBtns: {
    flexDirection: "row",
    gap: 10,
    alignSelf: "stretch",
  },
  dateModalCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#F5F4F2",
    alignItems: "center",
  },
  dateModalCancelText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#A09A94",
  },
  dateModalConfirm: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#D4501E",
    alignItems: "center",
  },
  dateModalConfirmText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
  },
  filterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  filterBtnActive: {
    backgroundColor: "#D4501E",
    borderColor: "#D4501E",
  },
  filterText: { fontSize: 13, fontWeight: "600", color: "#A09A94" },
  filterTextActive: { color: "#fff" },

  // Card
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  cardHeaderLeft: { flex: 1, gap: 6 },
  cardLocation: { fontSize: 15, fontWeight: "700", color: "#232230" },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  statusText: { fontSize: 11, fontWeight: "600" },
  slotBadge: {
    backgroundColor: "#F5F4F2",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  slotText: { fontSize: 12, fontWeight: "700", color: "#D4501E" },
  divider: { height: 1, backgroundColor: "#F0F0F0", marginBottom: 12 },

  // Driver
  driverRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  driverAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "#FFF0EC",
  },
  driverAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFF0EC",
  },
  driverName: { fontSize: 14, fontWeight: "600", color: "#232230" },
  driverMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  driverMetaText: { flex: 1, fontSize: 12, color: "#A09A94" },
  vehicleInline: { fontSize: 12, color: "#A09A94", marginTop: 2 },
  callBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F5F4F2",
    justifyContent: "center",
    alignItems: "center",
  },

  // Vehicle
  vehicleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  vehicleText: { fontSize: 13, color: "#A09A94" },

  // Time
  timeSection: { gap: 6, marginBottom: 12 },
  timeItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  timeText: { fontSize: 13, color: "#666" },

  // Amount
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  amountLabel: { fontSize: 16, fontWeight: "700", color: "#A09A94" },
  amountValue: { fontSize: 16, fontWeight: "700", color: "#D4501E" },
  overtimeText: { fontSize: 12, color: "#E53935" },

  // Empty State
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    paddingTop: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#232230",
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: "#A09A94",
    textAlign: "center",
    marginTop: 8,
  },

  // Accept / Reject buttons
  actionBtns: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  rejectBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#FFEBEE",
  },
  rejectBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#E53935",
  },
  confirmBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#D4501E",
  },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
  },
  notifBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#E53935",
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 3,
  },
  notifBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#fff",
  },
});
