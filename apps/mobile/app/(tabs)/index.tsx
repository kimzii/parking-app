import { View, Text, StyleSheet, ScrollView } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome to</Text>
            <Text style={styles.appName}>ParkLink</Text>
          </View>
          <View style={styles.logoIcon}>
            <MaterialIcons name="local-parking" size={24} color="#fff" />
          </View>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroIconContainer}>
            <MaterialIcons name="directions-car" size={40} color="#11796F" />
          </View>
          <Text style={styles.heroTitle}>Find Parking Near You</Text>
          <Text style={styles.heroSubtitle}>
            Search, compare, and book parking spots in seconds
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsRow}>
          <View style={styles.actionCard}>
            <View style={[styles.actionIcon, { backgroundColor: "#E8F5F3" }]}>
              <MaterialIcons name="search" size={24} color="#11796F" />
            </View>
            <Text style={styles.actionLabel}>Find Spot</Text>
          </View>
          <View style={styles.actionCard}>
            <View style={[styles.actionIcon, { backgroundColor: "#FFF3E0" }]}>
              <MaterialIcons name="history" size={24} color="#F57C00" />
            </View>
            <Text style={styles.actionLabel}>History</Text>
          </View>
          <View style={styles.actionCard}>
            <View style={[styles.actionIcon, { backgroundColor: "#E3F2FD" }]}>
              <MaterialIcons name="bookmark-outline" size={24} color="#1976D2" />
            </View>
            <Text style={styles.actionLabel}>Saved</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Nearby Parking</Text>
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <MaterialIcons name="location-off" size={36} color="#11796F" />
          </View>
          <Text style={styles.emptyTitle}>No nearby spots yet</Text>
          <Text style={styles.emptySubtitle}>
            Enable location services to find parking near you
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8FAFB" },
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 32 },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24,
  },
  greeting: { fontSize: 14, color: "#8E8E93" },
  appName: { fontSize: 28, fontWeight: "800", color: "#1A1A2E", letterSpacing: -0.5 },
  logoIcon: {
    width: 44, height: 44, borderRadius: 14, backgroundColor: "#11796F",
    justifyContent: "center", alignItems: "center",
    shadowColor: "#11796F", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 5,
  },
  heroCard: {
    backgroundColor: "#fff", borderRadius: 20, padding: 28, alignItems: "center", marginBottom: 28,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 16, elevation: 4,
  },
  heroIconContainer: {
    width: 72, height: 72, borderRadius: 22, backgroundColor: "#E8F5F3",
    justifyContent: "center", alignItems: "center", marginBottom: 16,
  },
  heroTitle: { fontSize: 20, fontWeight: "700", color: "#1A1A2E", marginBottom: 6 },
  heroSubtitle: { fontSize: 14, color: "#8E8E93", textAlign: "center", lineHeight: 20 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#1A1A2E", marginBottom: 14 },
  actionsRow: { flexDirection: "row", gap: 12, marginBottom: 28 },
  actionCard: {
    flex: 1, backgroundColor: "#fff", borderRadius: 16, paddingVertical: 20, alignItems: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  actionIcon: {
    width: 48, height: 48, borderRadius: 14, justifyContent: "center", alignItems: "center", marginBottom: 10,
  },
  actionLabel: { fontSize: 13, fontWeight: "600", color: "#1A1A2E" },
  emptyState: {
    backgroundColor: "#fff", borderRadius: 20, padding: 32, alignItems: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  emptyIcon: {
    width: 64, height: 64, borderRadius: 20, backgroundColor: "#E8F5F3",
    justifyContent: "center", alignItems: "center", marginBottom: 12,
  },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#1A1A2E", marginBottom: 4 },
  emptySubtitle: { fontSize: 13, color: "#8E8E93", textAlign: "center" },
});
