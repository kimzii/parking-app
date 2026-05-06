import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { getNotificationById } from "../../src/services/notifications";

type DetailParams = {
  id?: string;
};

function formatDate(dateStr?: string) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;

  return date.toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function NotificationDetailScreen() {
  const { id } = useLocalSearchParams<DetailParams>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    id: string;
    title: string;
    message: string;
    type: string;
    data?: Record<string, any>;
    isRead: boolean;
    createdAt: string;
  } | null>(null);

  const load = useCallback(async () => {
    if (!id) {
      setError("Missing notification id");
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const data = await getNotificationById(String(id));
      setNotification(data);
    } catch {
      setError("Failed to load notification");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  React.useEffect(() => {
    load();
  }, [load]);

  const dataPretty = useMemo(() => {
    if (!notification?.data) return "{}";
    try {
      return JSON.stringify(notification.data, null, 2);
    } catch {
      return String(notification.data);
    }
  }, [notification?.data]);

  return (
    <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
      <Stack.Screen
        options={{
          title: "Notification",
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={{ paddingHorizontal: 6 }}
            >
              <MaterialIcons name="arrow-back" size={22} color="#232230" />
            </TouchableOpacity>
          ),
        }}
      />

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#D4501E" />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorTitle}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              setRefreshing(true);
              load();
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : !notification ? (
        <View style={styles.centered}>
          <Text style={styles.errorTitle}>Notification not found</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
              tintColor="#D4501E"
            />
          }
        >
          <View style={styles.card}>
            <Text style={styles.title}>{notification.title}</Text>

            <View style={styles.metaRow}>
              <View style={styles.chip}>
                <Text style={styles.chipText}>{notification.type}</Text>
              </View>
              <Text style={styles.metaText}>
                {formatDate(notification.createdAt)}
              </Text>
            </View>

            <Text style={styles.message}>{notification.message}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Data</Text>
            <View style={styles.codeBox}>
              <Text style={styles.codeText}>{dataPretty}</Text>
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  card: {
    borderWidth: 1,
    borderColor: "#EEEAE6",
    borderRadius: 16,
    padding: 14,
    backgroundColor: "#FFFFFF",
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#232230",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 10,
  },
  metaText: {
    fontSize: 12,
    color: "#A09A94",
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#F5F4F2",
  },
  chipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#232230",
  },
  message: {
    marginTop: 12,
    fontSize: 14,
    color: "#232230",
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#232230",
    marginBottom: 10,
  },
  codeBox: {
    borderWidth: 1,
    borderColor: "#EEEAE6",
    backgroundColor: "#F5F4F2",
    borderRadius: 12,
    padding: 12,
  },
  codeText: {
    fontSize: 12,
    color: "#232230",
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#232230",
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: "#D4501E",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  retryText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
});
