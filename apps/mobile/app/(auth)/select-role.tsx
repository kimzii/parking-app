import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { authService } from "../../src/services/auth";

const ROLES = [
  {
    key: "DRIVER" as const,
    icon: "directions-car" as const,
    title: "Driver",
    description: "Find and book parking spots near you",
    color: "#11796F",
    bgColor: "#E8F5F3",
  },
  {
    key: "HOST" as const,
    icon: "home-work" as const,
    title: "Host",
    description: "List your parking spaces and earn money",
    color: "#1976D2",
    bgColor: "#E3F2FD",
  },
];

export default function SelectRoleScreen() {
  const [selectedRole, setSelectedRole] = useState<"DRIVER" | "HOST" | null>(null);
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    if (!selectedRole) {
      Alert.alert("Select a Role", "Please choose a role to continue.");
      return;
    }

    setLoading(true);
    try {
      await authService.selectRole(selectedRole);
      router.replace({
        pathname: "/(auth)/complete-profile",
        params: { role: selectedRole },
      });
    } catch (error: any) {
      const message =
        error.response?.data?.message ||
        error.message ||
        "Failed to assign role. Please try again.";
      Alert.alert("Error", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.logoIcon}>
            <MaterialIcons name="people" size={32} color="#fff" />
          </View>
          <Text style={styles.title}>Choose Your Role</Text>
          <Text style={styles.subtitle}>How would you like to use ParkLink?</Text>
        </View>

        <View style={styles.cardsContainer}>
          {ROLES.map((role) => {
            const isSelected = selectedRole === role.key;
            return (
              <TouchableOpacity
                key={role.key}
                style={[
                  styles.roleCard,
                  isSelected && { borderColor: role.color, borderWidth: 2.5 },
                ]}
                onPress={() => setSelectedRole(role.key)}
                activeOpacity={0.7}
                disabled={loading}
              >
                <View style={[styles.roleIconBg, { backgroundColor: role.bgColor }]}>
                  <MaterialIcons name={role.icon} size={36} color={role.color} />
                </View>
                <Text style={styles.roleTitle}>{role.title}</Text>
                <Text style={styles.roleDescription}>{role.description}</Text>
                {isSelected && (
                  <View style={[styles.checkBadge, { backgroundColor: role.color }]}>
                    <MaterialIcons name="check" size={18} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.bottomSection}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            !selectedRole && styles.continueButtonDisabled,
            loading && styles.continueButtonDisabled,
          ]}
          onPress={handleContinue}
          disabled={!selectedRole || loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.continueButtonText}>Continue</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFB",
    justifyContent: "space-between",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  header: {
    alignItems: "center",
    marginBottom: 36,
  },
  logoIcon: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: "#11796F",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#11796F",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1A1A2E",
    marginTop: 14,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: "#8E8E93",
    marginTop: 4,
  },
  cardsContainer: {
    gap: 16,
  },
  roleCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#E8ECF0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
    position: "relative",
  },
  roleIconBg: {
    width: 72,
    height: 72,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  roleTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1A1A2E",
    marginBottom: 6,
  },
  roleDescription: {
    fontSize: 14,
    color: "#8E8E93",
    textAlign: "center",
    lineHeight: 20,
  },
  checkBadge: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
  },
  bottomSection: {
    padding: 24,
    paddingBottom: 60,
  },
  continueButton: {
    backgroundColor: "#11796F",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    shadowColor: "#11796F",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  continueButtonDisabled: {
    backgroundColor: "#A8D5D1",
    shadowOpacity: 0,
  },
  continueButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
