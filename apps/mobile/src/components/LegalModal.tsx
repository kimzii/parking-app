import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
} from "react-native";
import Feather from "@expo/vector-icons/Feather";

export const TERMS_CONTENT = `PARKLINK TERMS AND CONDITIONS

Effective Date: [Insert Date]
Last Updated: [Insert Date]

1. ACCEPTANCE OF TERMS

By creating an account, accessing, or using the ParkLink mobile application ("App"), you agree to be bound by these Terms and Conditions ("Terms"). If you do not agree to these Terms, do not use the App.

2. ELIGIBILITY

To use ParkLink, you must:
• Be at least eighteen (18) years of age
• Possess a valid Philippine driver's license (for Drivers)
• Have the legal capacity to enter into a binding agreement
• Provide accurate and complete registration information

3. SERVICE DESCRIPTION

ParkLink is a peer-to-peer shared parking platform that connects vehicle owners ("Drivers") seeking parking spaces with property owners or authorized individuals ("Hosts") who offer available parking slots for temporary use within Barangay Obrero, Davao City.

ParkLink acts solely as an intermediary platform and does not own, operate, or manage any parking spaces listed on the App.

4. ACCOUNT REGISTRATION

To use ParkLink, you must create an account by providing the following information:

For All Users:
• Full name
• Mobile phone number (must be a valid, active number registered with GCash or another supported e-wallet, as this will be used for wallet top-up and withdrawal transactions)
• Email address

For Drivers:
• Vehicle information (model, type, plate number)
• Valid driver's license (photo/scan for identity verification)

For Hosts:
• Exact address of parking space
• Proof of ownership or authorization documents for the parking slot

You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account.

5. SERVICE FEES AND COMMISSION

ParkLink charges a ten percent (10%) commission fee on every successful parking booking transaction. This commission is automatically deducted from the total booking amount before remittance to the Host.

Example:
• Parking fee set by Host: ₱100.00
• ParkLink commission (10%): ₱10.00
• Amount remitted to Host: ₱90.00

All fees are subject to applicable taxes and may be updated with prior notice to users.

ParkLink uses an in-app wallet system for processing payments, top-ups, and withdrawals. Users are responsible for ensuring that the mobile number registered on their account is actively linked to a valid GCash or supported e-wallet account. ParkLink shall not be liable for failed or misdirected transactions resulting from an incorrect, inactive, or unlinked mobile number.

6. USER RESPONSIBILITIES

Drivers agree to:
• Provide accurate vehicle and personal information
• Arrive at the parking location within the reserved time
• Comply with parking rules set by the Host
• Vacate the parking space upon reservation expiry
• Treat Host property with care and respect

Hosts agree to:
• Provide accurate information about parking space availability, dimensions, and access
• Ensure the parking space is safe, accessible, and as described
• Honor confirmed reservations
• Have proper authority or ownership to list the parking space

7. LIMITATION OF LIABILITY

ParkLink is a platform that facilitates connections between Drivers and Hosts. ParkLink shall not be liable for:
• Damages, theft, or loss to vehicles or property during parking
• Disputes between Drivers and Hosts
• Inaccurate listing information provided by Hosts
• Personal injury occurring on Host premises
• Force majeure events or circumstances beyond our control

Users acknowledge that parking transactions are conducted at their own risk.

8. PROHIBITED ACTIVITIES

Users shall not:
• Provide false, misleading, or fraudulent information
• Use the App for illegal purposes
• Harass, threaten, or harm other users
• Circumvent the platform to avoid commission fees
• List parking spaces without proper authorization
• Violate any applicable local, national, or international laws

9. TERMINATION

ParkLink reserves the right to suspend or terminate your account at any time, with or without notice, for violations of these Terms or for any conduct that ParkLink deems harmful to the platform or its users.

10. MODIFICATIONS TO TERMS

ParkLink may modify these Terms at any time. Users will be notified of material changes through the App or via email. Continued use of the App after modifications constitutes acceptance of the updated Terms.

11. GOVERNING LAW AND DISPUTE RESOLUTION

These Terms shall be governed by and construed in accordance with the laws of the Republic of the Philippines. Any disputes arising from or related to these Terms or the use of ParkLink shall be resolved through mediation or, if necessary, before the appropriate courts of Davao City, Philippines.

12. CONTACT INFORMATION

For questions, concerns, or complaints regarding these Terms, please contact:

ParkLink Support
Email: support@parklink.ph
Address: Barangay Obrero, Davao City, Philippines`;

export const PRIVACY_CONTENT = `PARKLINK DATA PRIVACY POLICY

Effective Date: [Insert Date]

This Data Privacy Policy explains how ParkLink collects, uses, stores, and protects your personal information in compliance with Republic Act No. 10173, otherwise known as the "Data Privacy Act of 2012" (DPA), its Implementing Rules and Regulations (IRR), and relevant issuances of the National Privacy Commission (NPC).

1. DATA CONTROLLER

ParkLink
Address: Barangay Obrero, Davao City, Philippines
Email: privacy@parklink.ph
Data Protection Officer: [Name, if applicable]

2. INFORMATION WE COLLECT

2.1 Personal Information

We collect the following personal information as defined under Section 3(g) of RA 10173:

• Full Name — Account identification and communication (Retention: Duration of account + 2 years)
• Mobile Number — Account verification, notifications, and support (Retention: Duration of account + 2 years)
• Email Address — Account verification, notifications, and receipts (Retention: Duration of account + 2 years)
• Vehicle Information — Parking space matching and reservation management (Retention: Duration of account + 2 years)
• Parking Space Address — Location-based services and booking facilitation (Retention: Duration of account + 2 years)
• Location Data (GPS) — Real-time navigation, geofencing for arrival detection, and service optimization (Retention: Processed in real-time; aggregated data retained for 1 year)

2.2 Sensitive Personal Information

We collect the following sensitive personal information as defined under Section 3(l) of RA 10173:

• Driver's License (image/number) — Identity verification and eligibility confirmation. Legal Basis: Specific prior consent under Section 13(a), RA 10173.
• Proof of Ownership/Authorization Documents — Verification of Host's authority to list parking space. Legal Basis: Specific prior consent under Section 13(a), RA 10173.

Important: Your driver's license constitutes sensitive personal information under Section 3(l)(3) of RA 10173 as it is a government-issued document. We require your separate, specific consent before collecting and processing this information.

3. HOW WE USE YOUR INFORMATION

We process your personal information for the following purposes:
• Account creation and management — to register and maintain your ParkLink account
• Service facilitation — to connect Drivers with Hosts and process parking reservations
• Identity verification — to confirm user eligibility and prevent fraud
• Communication — to send booking confirmations, notifications, and support responses
• Location services — to provide navigation, geofencing-based arrival detection, and nearby parking recommendations
• Transaction processing — to calculate fees, commissions, and process payments
• Platform improvement — to analyze usage patterns and enhance user experience
• Legal compliance — to comply with applicable laws and regulatory requirements

4. LEGAL BASIS FOR PROCESSING

We process your data based on the following lawful criteria under RA 10173:
• Consent (Section 12(a)) — for personal information collected during registration
• Contractual necessity (Section 12(b)) — for data required to provide ParkLink services
• Specific prior consent (Section 13(a)) — for sensitive personal information (driver's license, ownership documents)
• Legal obligation (Section 12(c)) — for compliance with applicable laws

5. THIRD-PARTY SERVICES

ParkLink uses the following third-party service to enhance functionality:

Google Maps API
• Purpose: Location-based services, navigation, and mapping
• Data shared: Location data (GPS coordinates)
• Data transfer: Your location data may be transferred to Google LLC servers located outside the Philippines

We ensure that such cross-border transfers are subject to appropriate safeguards consistent with the requirements of RA 10173 and NPC Advisory No. 2024-01 on model contractual clauses for cross-border transfers.

6. DATA SHARING

We do not sell your personal information. We may share your data with:
• Other users — limited information necessary for booking (e.g., Driver's name and vehicle info shared with Host; Host's parking address shared with Driver)
• Service providers — third-party vendors who assist in payment processing, hosting, and analytics, bound by confidentiality agreements
• Legal authorities — when required by law, court order, or government agency request

7. DATA SECURITY

We implement reasonable organizational, physical, and technical security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction, in accordance with NPC Circular No. 2023-06. These measures include:
• Encryption of sensitive data in storage and transit
• Secure authentication mechanisms
• Access controls limiting data access to authorized personnel
• Regular security assessments and updates

8. DATA RETENTION

We retain your personal information only for as long as necessary to fulfill the purposes for which it was collected, or as required by applicable laws. Upon account deletion or service termination, your data will be securely disposed of within a reasonable period, except where retention is required for legal or regulatory purposes.

9. YOUR RIGHTS AS A DATA SUBJECT

Under Sections 16–18 of RA 10173, you have the following rights:
1. Right to be Informed — to know how your data is collected and processed
2. Right to Access — to obtain a copy of your personal data
3. Right to Rectification — to correct inaccurate or incomplete data
4. Right to Erasure or Blocking — to request deletion or suspension of data processing
5. Right to Object — to refuse processing, including profiling based on location
6. Right to Data Portability — to obtain your data in a structured, commonly used electronic format
7. Right to Damages — to seek compensation for damages due to unlawful processing
8. Right to Lodge a Complaint — to file a complaint with the National Privacy Commission

To exercise any of these rights, please contact us at privacy@parklink.ph.

10. DATA BREACH NOTIFICATION

In the event of a personal data breach that is likely to cause serious harm to affected data subjects, we will notify the National Privacy Commission and affected users within seventy-two (72) hours upon knowledge of the breach, in accordance with the IRR of RA 10173 and NPC Circular No. 16-03.

11. CHANGES TO THIS POLICY

We may update this Data Privacy Policy from time to time. Users will be notified of material changes through the App or via email. Continued use of ParkLink after such changes constitutes acceptance of the updated policy.

12. CONTACT US

For questions, concerns, or requests regarding your personal data, please contact:

ParkLink Data Protection Officer
Email: privacy@parklink.ph
Address: Barangay Obrero, Davao City, Philippines

You may also file a complaint with the National Privacy Commission at:
Website: https://privacy.gov.ph
Email: complaints@privacy.gov.ph`;

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
      <View style={styles.container}>
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
      </View>
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
