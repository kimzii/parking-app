import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

interface EWalletProps {
  balance: number;
  loading?: boolean;
  onTopUp?: () => void;
  onWithdraw?: () => void;
  locked?: boolean;
  hasOutstandingBalance?: boolean;
  pendingDue?: number | null;
  onSettleDue?: () => void;
  settling?: boolean;
}

export const EWallet: React.FC<EWalletProps> = ({
  balance,
  loading,
  onTopUp,
  onWithdraw,
  locked,
  hasOutstandingBalance,
  pendingDue,
  onSettleDue,
  settling,
}) => {
  const hasOutstanding = hasOutstandingBalance === true;
  const showButtons = !hasOutstanding && (onTopUp !== undefined || onWithdraw !== undefined);

  return (
    <View style={styles.card}>
      {/* Header row */}
      <View style={styles.iconRow}>
        <View style={styles.iconBg}>
          <MaterialIcons name="account-balance-wallet" size={24} color="#fff" />
        </View>
        <Text style={styles.label}>Available Balance</Text>
      </View>

      {/* Balance amount */}
      {loading ? (
        <ActivityIndicator size="small" color="#fff" style={{ marginVertical: 12 }} />
      ) : (
        <Text style={styles.amount}>₱ {Number(balance).toFixed(2)}</Text>
      )}

      {/* Locked banner */}
      {locked && !hasOutstanding && (
        <View style={styles.lockedBanner}>
          <MaterialIcons name="lock" size={14} color="#D4501E" />
          <Text style={styles.lockedText}>Verify your account to unlock wallet features</Text>
        </View>
      )}

      {/* Outstanding balance section */}
      {hasOutstanding && (
        <View style={styles.debtSection}>
          <View style={styles.debtRow}>
            <MaterialIcons name="warning" size={16} color="#FFD54F" />
            <View style={{ flex: 1 }}>
              <Text style={styles.debtTitle}>Outstanding Balance</Text>
              <Text style={styles.debtAmount}>
                ₱{(pendingDue ?? 0).toFixed(2)} unpaid from last session
              </Text>
            </View>
            {onSettleDue !== undefined && (
              <TouchableOpacity
                style={styles.settleBtn}
                onPress={onSettleDue}
                disabled={settling}
                activeOpacity={0.8}
              >
                {settling ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.settleBtnText}>Pay Now</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Action buttons */}
      {showButtons && (
        <View style={styles.btnRow}>
          {onTopUp !== undefined && (
            <TouchableOpacity
              style={[styles.btn, onWithdraw !== undefined && styles.btnBorderRight]}
              onPress={onTopUp}
              activeOpacity={0.8}
            >
              <MaterialIcons
                name={locked ? "lock" : "add-circle-outline"}
                size={18}
                color="#fff"
              />
              <Text style={styles.btnText}>{locked ? "Verify to Top Up" : "Top Up"}</Text>
            </TouchableOpacity>
          )}
          {onWithdraw !== undefined && (
            <TouchableOpacity
              style={styles.btn}
              onPress={onWithdraw}
              activeOpacity={0.8}
            >
              <MaterialIcons
                name={locked ? "lock" : "account-balance"}
                size={18}
                color="#fff"
              />
              <Text style={styles.btnText}>{locked ? "Verify" : "Withdraw"}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#D4501E",
    borderRadius: 20,
    padding: 24,
    shadowColor: "#D4501E",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 6,
  },
  iconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 4,
  },
  iconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  label: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
    fontWeight: "500",
  },
  amount: {
    fontSize: 36,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -0.5,
    marginVertical: 8,
  },
  lockedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.1)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginTop: 4,
    marginBottom: 4,
  },
  lockedText: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.85)",
  },
  debtSection: {
    backgroundColor: "rgba(0,0,0,0.25)",
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
  },
  debtRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  debtTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFD54F",
  },
  debtAmount: {
    fontSize: 11,
    color: "rgba(255,255,255,0.85)",
    marginTop: 1,
  },
  settleBtn: {
    backgroundColor: "#E53935",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: "center",
  },
  settleBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
  },
  btnRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  btn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  btnBorderRight: {
    // kept for potential use; gap in btnRow handles spacing
  },
  btnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
});
