import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  TextInput,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type FAQItem = { q: string; a: string };
type FAQSection = { title: string; icon: string; data: FAQItem[] };

const FAQ_DATA: FAQSection[] = [
  {
    title: "General",
    icon: "info-outline",
    data: [
      {
        q: "What is ParkLink?",
        a: "ParkLink is a peer-to-peer shared parking platform that connects vehicle owners (\"Drivers\") looking for parking spaces with property owners (\"Hosts\") who have available parking slots — all within Barangay Obrero, Davao City.",
      },
      {
        q: "Who can use ParkLink?",
        a: "ParkLink is designed for:\n• Drivers – Anyone who needs a safe, nearby parking spot.\n• Hosts – Property owners or authorized individuals who want to rent out their available parking spaces.\n\nYou must be at least 18 years old and have a valid Philippine driver's license (for drivers) to register.",
      },
      {
        q: "Is ParkLink free to use?",
        a: "Creating an account and browsing parking spaces is free. Drivers are charged based on the host's rate per hour. ParkLink charges a small platform fee on each transaction.",
      },
    ],
  },
  {
    title: "Account & Registration",
    icon: "person-outline",
    data: [
      {
        q: "How do I create an account?",
        a: "1. Download ParkLink from the app store.\n2. Sign up using your name, email, and phone number.\n3. Choose your role – Driver, Host, or both.\n4. Complete the required verification steps (e.g., driver's license for Drivers, property verification for Hosts).",
      },
      {
        q: "Can I be both a Driver and a Host?",
        a: "Yes! You can switch between Driver and Host mode from the Settings tab inside the app.",
      },
      {
        q: "What if I forget my password?",
        a: "Tap \"Forgot Password\" on the login screen. You'll receive a password reset link via email.",
      },
    ],
  },
  {
    title: "For Drivers – Booking",
    icon: "directions-car",
    data: [
      {
        q: "How do I find and book a parking space?",
        a: "1. Open ParkLink and browse nearby parking spaces using the map or list view.\n2. Tap on a parking space to view details (rate, available slots, reviews).\n3. Select a slot and tap \"Reserve.\"\n4. The Host will be notified and can accept or decline your reservation.",
      },
      {
        q: "What happens after I book?",
        a: "• If the Host accepts, you'll get a confirmation with a QR code.\n• If the Host declines or doesn't respond within the set timeframe, the reservation will be cancelled.",
      },
      {
        q: "Can I cancel my reservation?",
        a: "Yes, you can cancel a reservation before the session starts. Once the session is active, the cancellation may be handled differently depending on the situation.",
      },
      {
        q: "What is the QR code for?",
        a: "When you arrive at the parking space, the Host will scan your QR code to confirm your arrival and start the parking session.",
      },
    ],
  },
  {
    title: "For Drivers – Parking Session",
    icon: "timer",
    data: [
      {
        q: "How does a parking session work?",
        a: "1. Arrive at the parking location.\n2. The Host scans your QR code to start the session.\n3. Park your vehicle in the assigned slot.\n4. When you're ready to leave, notify the Host.\n5. The Host scans the QR code again to end the session.\n6. Payment is calculated based on the duration.",
      },
      {
        q: "What if I exceed my reserved time?",
        a: "ParkLink uses a pay-as-you-go model. You'll be charged for the actual time used based on the host's rate per hour. Overtime charges may apply.",
      },
    ],
  },
  {
    title: "For Drivers – Navigation",
    icon: "map",
    data: [
      {
        q: "How do I navigate to a parking space?",
        a: "After your reservation is confirmed, you can tap \"Navigate\" to get directions to the parking space using your device's default maps app (Google Maps, Apple Maps, or Waze).",
      },
    ],
  },
  {
    title: "For Hosts – Listing",
    icon: "home-work",
    data: [
      {
        q: "How do I list my parking space?",
        a: "1. Switch to Host mode in the app.\n2. Tap \"Add Parking Space\" on the home screen.\n3. Fill in the required details:\n   • Location name and address\n   • Number of available slots\n   • Rate per hour\n   • Accepted vehicle types (car, motorcycle, or both)\n   • Photos of the space\n4. Submit the listing for review. Once approved, it will appear on the map for Drivers.",
      },
      {
        q: "Can I set my own price?",
        a: "Yes, Hosts have full control over the hourly rate for their parking spaces.",
      },
      {
        q: "Can I temporarily hide my listing?",
        a: "Yes, you can set your listing to inactive from the parking space settings. It will not appear on the map until you reactivate it.",
      },
    ],
  },
  {
    title: "For Hosts – Managing Bookings",
    icon: "event-note",
    data: [
      {
        q: "How do I accept or decline a booking?",
        a: "When a Driver reserves your space, you'll receive a push notification and in-app alert. Tap the notification to view the reservation and choose to accept or decline.",
      },
      {
        q: "How do I start and end a session?",
        a: "Use the QR scanner on the Reservations screen to:\n• Scan the Driver's QR code when they arrive (starts the session).\n• Scan again when they leave (ends the session and triggers payment calculation).",
      },
      {
        q: "What if a Driver doesn't show up?",
        a: "If a driver doesn't arrive before the arrival deadline, the reservation will automatically expire.",
      },
    ],
  },
  {
    title: "For Hosts – Reviews",
    icon: "star-outline",
    data: [
      {
        q: "Can I rate a Driver?",
        a: "Yes! After a session ends, you'll be prompted to leave a rating and review for the Driver.",
      },
    ],
  },
  {
    title: "Wallet & Payments",
    icon: "account-balance-wallet",
    data: [
      {
        q: "How does the ParkLink Wallet work?",
        a: "Each user has a built-in wallet:\n• Drivers use it to pay for parking.\n• Hosts receive their earnings in it.\n\nYou can top up your wallet through supported e-wallet services (e.g., GCash).",
      },
      {
        q: "How do I top up my wallet?",
        a: "Go to the Wallet tab, tap \"Top Up,\" and choose your preferred method. Follow the instructions to complete the top-up.",
      },
      {
        q: "How are payments processed?",
        a: "When a reservation is confirmed, the estimated amount is held in escrow. After the session ends, the actual charge is calculated, and the Host's payout is released minus the platform fee.",
      },
      {
        q: "Can I withdraw my earnings?",
        a: "Yes, Hosts can withdraw their wallet balance through the supported payout methods (e.g., GCash). Minimum withdrawal amounts may apply.",
      },
    ],
  },
  {
    title: "Fees & Commission",
    icon: "receipt-long",
    data: [
      {
        q: "What fees does ParkLink charge?",
        a: "ParkLink charges a small platform fee on each completed transaction. The fee is automatically deducted from the total amount before the Host's payout is released.",
      },
      {
        q: "Will I see the fee before booking?",
        a: "Yes, the total cost including platform fees will be shown before you confirm a reservation.",
      },
    ],
  },
  {
    title: "Ratings & Reviews",
    icon: "star-half",
    data: [
      {
        q: "How does the rating system work?",
        a: "After each completed session:\n• Drivers can rate and review the parking space.\n• Hosts can rate and review the Driver.\n\nRatings are on a 1–5 star scale and help build trust within the community.",
      },
      {
        q: "Can I edit or delete my review?",
        a: "Currently, reviews cannot be edited or deleted once submitted. Please ensure your review is accurate before submitting.",
      },
    ],
  },
  {
    title: "Notifications",
    icon: "notifications-none",
    data: [
      {
        q: "What notifications will I receive?",
        a: "You'll receive notifications for:\n• Reservation requests (Host)\n• Booking confirmations/cancellations\n• Session start and end\n• Payment confirmations\n• Wallet top-ups and withdrawals\n• Reviews received",
      },
      {
        q: "Can I turn off notifications?",
        a: "You can manage your notification preferences from your device's app settings.",
      },
    ],
  },
  {
    title: "Safety & Privacy",
    icon: "shield",
    data: [
      {
        q: "Is my personal information safe?",
        a: "Yes. ParkLink follows strict data privacy practices in compliance with the Data Privacy Act of 2012 (RA 10173). Your personal data is encrypted and only used for the purposes described in our Privacy Policy.",
      },
      {
        q: "What if I experience a safety issue?",
        a: "If you feel unsafe during a transaction, contact ParkLink support immediately through the app or via email. We take all reports seriously.",
      },
    ],
  },
  {
    title: "Technical Issues",
    icon: "build",
    data: [
      {
        q: "The app is not loading or crashing. What should I do?",
        a: "Try the following:\n1. Restart the app.\n2. Check your internet connection.\n3. Update to the latest version of ParkLink.\n4. Clear the app cache.\n5. If the problem persists, contact support.",
      },
      {
        q: "I can't see any parking spaces on the map.",
        a: "Make sure:\n• Location services are enabled.\n• You are within the supported area (Barangay Obrero, Davao City).\n• Your internet connection is stable.",
      },
    ],
  },
  {
    title: "Contact & Support",
    icon: "support-agent",
    data: [
      {
        q: "How can I contact ParkLink support?",
        a: "You can reach us through:\n• In-app Help & Support\n• Email: support@parklink.app\n• Phone: +63 XXX XXX XXXX\n• Operating Hours: Monday–Saturday, 8:00 AM – 6:00 PM",
      },
    ],
  },
];

function FAQItemRow({ item, expanded, onToggle }: {
  item: FAQItem;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.faqItem}
      onPress={onToggle}
      activeOpacity={0.7}
    >
      <View style={styles.questionRow}>
        <Text style={styles.questionText}>{item.q}</Text>
        <MaterialIcons
          name={expanded ? "expand-less" : "expand-more"}
          size={22}
          color="#A09A94"
        />
      </View>
      {expanded && (
        <Text style={styles.answerText}>{item.a}</Text>
      )}
    </TouchableOpacity>
  );
}

export default function FAQScreen() {
  const [search, setSearch] = useState("");
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

  const toggleItem = (key: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const filteredSections = useMemo(() => {
    if (!search.trim()) return FAQ_DATA;
    const q = search.toLowerCase();
    return FAQ_DATA.map((section) => ({
      ...section,
      data: section.data.filter(
        (item) =>
          item.q.toLowerCase().includes(q) ||
          item.a.toLowerCase().includes(q),
      ),
    })).filter((section) => section.data.length > 0);
  }, [search]);

  return (
    <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
      <Stack.Screen options={{ title: "FAQs" }} />

      {/* Search */}
      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={20} color="#A09A94" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search FAQs..."
          placeholderTextColor="#C7C7CC"
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <MaterialIcons name="close" size={20} color="#A09A94" />
          </TouchableOpacity>
        )}
      </View>

      <SectionList
        sections={filteredSections}
        keyExtractor={(item, index) => item.q + index}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <MaterialIcons
              name={section.icon as any}
              size={18}
              color="#D4501E"
            />
            <Text style={styles.sectionTitle}>{section.title}</Text>
          </View>
        )}
        renderItem={({ item, section, index }) => {
          const key = `${section.title}-${index}`;
          return (
            <FAQItemRow
              item={item}
              expanded={expandedKeys.has(key)}
              onToggle={() => toggleItem(key)}
            />
          );
        }}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialIcons name="search-off" size={48} color="#C7C7CC" />
            <Text style={styles.emptyTitle}>No results found</Text>
            <Text style={styles.emptyText}>
              Try a different search term
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },

  // Search
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#F5F4F2",
    borderRadius: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#232230",
    padding: 0,
  },

  // List
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },

  // Section header
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 20,
    paddingBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#232230",
  },

  // FAQ item
  faqItem: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#F0EDE8",
  },
  questionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  questionText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#232230",
    lineHeight: 20,
  },
  answerText: {
    fontSize: 13,
    color: "#6B6B6B",
    lineHeight: 20,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F0EDE8",
  },

  // Empty
  emptyState: {
    alignItems: "center",
    paddingTop: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#232230",
    marginTop: 12,
  },
  emptyText: {
    fontSize: 13,
    color: "#A09A94",
    marginTop: 4,
  },
});
