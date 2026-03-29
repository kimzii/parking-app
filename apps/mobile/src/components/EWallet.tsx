import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

interface EWalletProps {
  balance: number;
  onTopUp?: () => void;
  onWithdraw?: () => void;
  locked?: boolean;
}

export const EWallet: React.FC<EWalletProps> = ({
  balance,
  onTopUp,
  onWithdraw,
  locked,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.topSection}>
        <View style={styles.labelRow}>
          <MaterialIcons name="account-balance-wallet" size={18} color="rgba(255,255,255,0.7)" />
          <Text style={styles.title}>E-Wallet</Text>
        </View>
        <Text style={styles.balance}>₱ {Number(balance).toFixed(2)}</Text>
      </View>
      {locked && (
        <View style={styles.lockedBanner}>
          <MaterialIcons name="lock" size={14} color="#D4501E" />
          <Text style={styles.lockedText}>Verify your account to unlock wallet features</Text>
        </View>
      )}
      <View style={styles.buttonRow}>
        {onTopUp !== undefined && (
          <TouchableOpacity
            style={[
              styles.button,
              locked && styles.buttonLocked,
              onWithdraw !== undefined && styles.buttonBorderRight,
            ]}
            onPress={onTopUp}
            activeOpacity={0.8}
          >
            <MaterialIcons name={locked ? "lock" : "add-circle-outline"} size={20} color="white" />
            <Text style={styles.buttonText}>{locked ? "Verify to Top Up" : "Top Up"}</Text>
          </TouchableOpacity>
        )}
        {onWithdraw !== undefined && (
          <TouchableOpacity
            style={[styles.button, locked && styles.buttonLocked]}
            onPress={onWithdraw}
            activeOpacity={0.8}
          >
            <MaterialIcons name={locked ? "lock" : "account-balance"} size={20} color="white" />
            <Text style={styles.buttonText}>{locked ? "Verify" : "Withdraw"}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#D4501E",
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#D4501E",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  topSection: {
    paddingTop: 22,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  title: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
    fontWeight: "600",
  },
  balance: {
    fontSize: 34,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -0.5,
  },
  buttonRow: {
    flexDirection: "row",
  },
  button: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.15)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
  },
  buttonBorderRight: {
    borderRightWidth: 1,
    borderRightColor: "rgba(255,255,255,0.15)",
  },
  buttonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  buttonLocked: {
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  lockedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.1)",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  lockedText: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.85)",
  },
});
