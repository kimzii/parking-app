import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Feather from "@expo/vector-icons/Feather";

export const TERMS_CONTENT = `PARKLINK TERMS AND CONDITIONS

Effective Date: 08/04/2026
Last Updated: 08/04/2026

By creating an account or using ParkLink, you agree to these Terms and Conditions. Please read them carefully.

1. DEFINITIONS

"Platform" refers to the ParkLink mobile application and web dashboard.
"Driver" refers to a registered user who searches for and books parking spaces.
"Host" refers to a registered user who lists parking spaces for rent.
"Reservation" refers to a booking made by a Driver for a Host's parking space.
"Session" refers to the period between check-in (entry) and check-out (exit) at a parking space.
"Wallet" refers to the in-app credit balance used for transactions.
"Escrow" refers to funds held by the platform during a reservation until session completion.

2. ELIGIBILITY

To use ParkLink, you must:
\u2022 Be at least 18 years old
\u2022 Possess a valid Philippine driver's license (for Drivers)
\u2022 Have legal authority to list a parking space (for Hosts)
\u2022 Provide accurate and complete registration information

3. ACCOUNT REGISTRATION

Users must register with a valid email address and verify their identity. Drivers must submit a valid driver's license for verification. Hosts must provide proof of ownership or authorization for any listed parking space. ParkLink reserves the right to reject or suspend accounts that fail verification.

4. PLATFORM SERVICES

ParkLink connects Drivers seeking parking with Hosts offering available spaces in Davao City. The platform provides:
\u2022 Real-time parking space discovery and availability
\u2022 Reservation and booking management
\u2022 QR code-based check-in and check-out
\u2022 In-app wallet for payments
\u2022 Ratings and reviews for both Drivers and Hosts

ParkLink acts as an intermediary and is not a party to the parking arrangement between Drivers and Hosts.

5. BOOKING AND RESERVATION PROCESS

5.1 Making a Reservation
When a Driver books a parking space:
\u2022 The first-hour fee (based on the Host's hourly rate) is immediately deducted from the Driver's wallet and held as escrow.
\u2022 The reservation status is set to PENDING while awaiting Host approval.
\u2022 Drivers must have sufficient wallet balance to cover the first-hour fee to complete a booking.

5.2 Host Approval
\u2022 Hosts have a 5-minute window to approve or reject incoming reservation requests.
\u2022 If approved, the reservation status changes to CONFIRMED and the Driver is notified.
\u2022 If rejected, the escrow is refunded to the Driver's wallet immediately.
\u2022 If the Host does not respond within 5 minutes, the reservation expires automatically and the escrow is refunded.

5.3 Arrival Window
\u2022 Once confirmed, Drivers have 60 minutes to arrive at the parking location.
\u2022 Failure to arrive within 60 minutes results in reservation expiration and forfeiture of the escrow (no refund).

5.4 Check-In and Check-Out
\u2022 Upon arrival, the Driver presents their QR code for the Host to scan, starting the parking session.
\u2022 Upon departure, the Host scans the Driver's QR code again to end the session.
\u2022 Parking duration is automatically calculated from check-in to check-out.

5.5 Duration Calculation
\u2022 Parking duration is rounded up to the nearest hour for billing purposes.
\u2022 Example: A session lasting 1 hour and 15 minutes is billed as 2 hours.

6. WALLET AND PAYMENT POLICIES

6.1 In-App Wallet
All transactions within ParkLink are processed through the in-app wallet. Drivers must maintain sufficient balance to make reservations. Hosts receive earnings in their wallet after completed sessions.

6.2 Top-Up Process
\u2022 Drivers request a top-up by selecting an amount in the app.
\u2022 An admin reviews the request and, upon approval, the Driver pays via GCash.
\u2022 Once payment is confirmed by admin, the wallet balance is credited.
\u2022 Top-up requests not acted upon within 5 minutes expire automatically.

6.3 Session Settlement
Upon check-out, the system calculates the total fee based on actual parking duration:
\u2022 Total Fee = Hourly Rate \u00d7 Hours Parked (rounded up)
\u2022 Platform Commission = 10% of Total Fee
\u2022 Host Payout = 90% of Total Fee

If the total fee is less than or equal to the escrow, the Host receives their payout and any difference is handled accordingly. If the total fee exceeds the escrow, the additional amount is deducted from the Driver's wallet.

6.4 Insufficient Balance
If a Driver's wallet has insufficient funds to cover charges exceeding the escrow:
\u2022 The reservation is marked as PAYMENT_PENDING.
\u2022 The Driver is notified of the outstanding balance.
\u2022 The Host's payout is held until the Driver settles the balance.
\u2022 Drivers with outstanding balances are restricted from making new bookings until settled.
\u2022 Upon the Driver's next top-up, the outstanding balance is automatically deducted before the remaining amount is credited.

6.5 Host Withdrawals
\u2022 Hosts may withdraw their wallet balance by submitting a withdrawal request.
\u2022 Withdrawals are processed manually via GCash by an admin.
\u2022 Hosts must have a valid GCash number registered in their profile.

6.6 Refunds and Cancellations
\u2022 Driver cancels before session starts: Escrow is refunded to Driver's wallet.
\u2022 Host rejects reservation: Escrow is refunded to Driver's wallet.
\u2022 Reservation expires (Driver doesn't arrive within 60 minutes): Escrow is forfeited (no refund).
\u2022 Admin cancels reservation: Escrow is refunded to Driver's wallet; Host payout may be settled at admin discretion.

7. FEES AND COMMISSION

ParkLink charges a 10% commission on every completed parking transaction. This commission is automatically deducted from the Host's earnings before payout.

8. HOST RESPONSIBILITIES

Hosts agree to:
\u2022 List only parking spaces they own or have legal authority to rent
\u2022 Provide accurate descriptions, photos, and pricing
\u2022 Maintain the listed parking space in safe and usable condition
\u2022 Respond to reservation requests within the 5-minute approval window
\u2022 Verify Driver arrival and departure by scanning QR codes
\u2022 Honor confirmed reservations

9. DRIVER RESPONSIBILITIES

Drivers agree to:
\u2022 Provide accurate vehicle and personal information
\u2022 Maintain sufficient wallet balance for bookings
\u2022 Arrive within the 60-minute arrival window after confirmation
\u2022 Park only in the designated reserved space
\u2022 Check out properly by having the Host scan their QR code upon departure
\u2022 Settle any outstanding balances promptly

10. RATINGS AND REVIEWS

Both Drivers and Hosts may rate and review each other after a completed session. Reviews must be honest and respectful. ParkLink reserves the right to remove reviews that violate community guidelines or contain inappropriate content.

11. PROHIBITED CONDUCT

Users shall not:
\u2022 Provide false or misleading information
\u2022 Use the platform for illegal activities
\u2022 Harass, threaten, or harm other users
\u2022 Attempt to bypass platform fees or payments
\u2022 List spaces without proper authorization
\u2022 Manipulate ratings or reviews

Violation of these terms may result in account suspension or termination.

12. LIMITATION OF LIABILITY

ParkLink is an intermediary platform and is not responsible for:
\u2022 Damage to vehicles or property during parking sessions
\u2022 Disputes between Drivers and Hosts
\u2022 Accuracy of Host-provided information
\u2022 Loss or theft of personal belongings

Users are encouraged to resolve disputes directly. ParkLink may assist in mediation but is not obligated to do so.

13. MODIFICATIONS

ParkLink reserves the right to modify these Terms and Conditions at any time. Users will be notified of significant changes. Continued use of the platform after changes constitutes acceptance of the updated terms.

14. GOVERNING LAW

These Terms and Conditions are governed by the laws of the Republic of the Philippines. Any disputes shall be resolved in the courts of Davao City.

15. CONTACT INFORMATION

For questions or concerns regarding these Terms and Conditions, contact us at:
Email: support@parklink.ph`;

export const PRIVACY_CONTENT = `PARKLINK DATA PRIVACY POLICY

Effective Date: 08/04/2026
Last Updated: 08/04/2026

ParkLink is committed to protecting your privacy in compliance with Republic Act No. 10173, also known as the Data Privacy Act of 2012.

1. INFORMATION WE COLLECT

1.1 Personal Information
\u2022 Full name
\u2022 Email address
\u2022 Phone number
\u2022 Driver's license number and image (for Drivers)
\u2022 Profile photo

1.2 Location Information
\u2022 GPS coordinates when using the app
\u2022 Parking space addresses (for Hosts)

1.3 Transaction Information
\u2022 Wallet transactions (top-ups, payments, withdrawals)
\u2022 Reservation history
\u2022 Session records (check-in/check-out times)

1.4 Device Information
\u2022 Device type and operating system
\u2022 App version
\u2022 Push notification tokens

2. HOW WE USE YOUR INFORMATION

We use collected information to:
\u2022 Verify user identity and eligibility
\u2022 Process reservations and payments
\u2022 Enable location-based parking discovery
\u2022 Send notifications about bookings and transactions
\u2022 Improve platform features and user experience
\u2022 Comply with legal obligations

3. INFORMATION SHARING

We may share your information with:
\u2022 Other Users: Drivers see Host names and parking details; Hosts see Driver names and vehicle information for verified reservations.
\u2022 Service Providers: Third-party services for payment processing (GCash), cloud storage, and notifications.
\u2022 Legal Authorities: When required by law or to protect platform integrity.

We do not sell your personal information to third parties.

4. DATA RETENTION

We retain your personal information for as long as your account is active or as needed to provide services. Transaction records are retained for a minimum of three (3) years for accounting and legal compliance purposes. You may request deletion of your account and associated data, subject to legal retention requirements.

5. DATA SECURITY

We implement appropriate technical and organizational measures to protect your personal information, including:
\u2022 Encryption of sensitive data
\u2022 Secure authentication (JWT tokens)
\u2022 Access controls and audit logging
\u2022 Regular security assessments

6. YOUR RIGHTS

Under the Data Privacy Act of 2012, you have the right to:
\u2022 Access your personal information held by ParkLink
\u2022 Correct inaccurate or incomplete information
\u2022 Object to processing of your personal information
\u2022 Erasure of your personal information, subject to legal requirements
\u2022 Data Portability to obtain your data in a structured format

To exercise these rights, contact our Data Protection Officer at privacy@parklink.ph.

7. COOKIES AND TRACKING

The ParkLink mobile application may use local storage and analytics tools to improve performance and user experience. These do not collect personally identifiable information without your consent.

8. CHANGES TO THIS POLICY

We may update this Privacy Policy from time to time. Users will be notified of significant changes through the app or email. Continued use of the platform constitutes acceptance of the updated policy.

9. CONTACT INFORMATION

For privacy-related inquiries or to exercise your data rights:
\u2022 Data Protection Officer: privacy@parklink.ph
\u2022 General Support: support@parklink.ph


SENSITIVE PERSONAL INFORMATION (SPI) CONSENT FORM

By using ParkLink, you consent to the collection and processing of the following Sensitive Personal Information as defined under RA 10173:

Information Collected:
\u2022 Driver's license number and image (for identity verification)
\u2022 Government-issued ID details (if required for Host verification)

Purpose:
\u2022 To verify user identity and eligibility
\u2022 To ensure platform security and trust
\u2022 To comply with legal and regulatory requirements

Consent:
By checking "I Agree" during registration or by continuing to use the platform, you expressly consent to the collection, processing, and storage of your Sensitive Personal Information for the purposes stated above.

You may withdraw this consent at any time by contacting privacy@parklink.ph. Withdrawal of consent may result in the suspension or termination of your account.

References:
\u2022 Republic Act No. 10173, "Data Privacy Act of 2012"
\u2022 NPC Circular No. 2023-04: Guidelines on Consent`;

export type LegalTab = "terms" | "privacy";

interface LegalModalProps {
  visible: boolean;
  initialTab?: LegalTab;
  onClose: () => void;
  /** If provided, shows an Accept button that calls this instead of just closing */
  onAccept?: (tab: LegalTab) => void;
}

export default function LegalModal({
  visible,
  initialTab = "terms",
  onClose,
  onAccept,
}: LegalModalProps) {
  const [activeTab, setActiveTab] = useState<LegalTab>(initialTab);

  // Sync tab when modal opens with a different initialTab
  React.useEffect(() => {
    if (visible) setActiveTab(initialTab);
  }, [visible, initialTab]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Legal Documents</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Feather name="x" size={20} color="#232230" />
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "terms" && styles.tabActive]}
            onPress={() => setActiveTab("terms")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "terms" && styles.tabTextActive,
              ]}
            >
              Terms & Conditions
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "privacy" && styles.tabActive]}
            onPress={() => setActiveTab("privacy")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "privacy" && styles.tabTextActive,
              ]}
            >
              Data Privacy Policy
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
        >
          <Text style={styles.documentText}>
            {activeTab === "terms" ? TERMS_CONTENT : PRIVACY_CONTENT}
          </Text>
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          {onAccept ? (
            <TouchableOpacity
              style={styles.acceptBtn}
              onPress={() => onAccept(activeTab)}
              activeOpacity={0.8}
            >
              <Text style={styles.acceptBtnText}>
                I Accept the{" "}
                {activeTab === "terms"
                  ? "Terms & Conditions"
                  : "Data Privacy Policy"}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.closeFooterBtn}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={styles.closeFooterBtnText}>Close</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E8ECF0",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#232230",
  },
  closeBtn: {
    padding: 4,
  },
  tabRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#E8ECF0",
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: "#D4501E",
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#A09A94",
  },
  tabTextActive: {
    color: "#D4501E",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  documentText: {
    fontSize: 13,
    color: "#232230",
    lineHeight: 22,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#E8ECF0",
  },
  acceptBtn: {
    backgroundColor: "#D4501E",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  acceptBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  closeFooterBtn: {
    backgroundColor: "#F5F4F2",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  closeFooterBtnText: {
    color: "#232230",
    fontSize: 15,
    fontWeight: "700",
  },
});
