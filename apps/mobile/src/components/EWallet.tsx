import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

interface EWalletProps {
  balance: number;
  onTopUp?: () => void;
  onWithdraw?: () => void;
}

export const EWallet: React.FC<EWalletProps> = ({
  balance,
  onTopUp,
  onWithdraw,
}) => {
  return (
    <ImageBackground
      source={require("../../assets/images/coin.png")}
      style={styles.container}
      imageStyle={{
        position: "absolute",
        right: 0,
        top: 20,
        width: "170%",
        height: "130%",
        resizeMode: "contain",
        borderTopRightRadius: 16,
        borderBottomRightRadius: 16,
      }}
    >
      <View style={styles.topSection}>
        <View style={styles.labelRow}>
          <MaterialIcons name="account-balance-wallet" size={18} color="rgba(255,255,255,0.7)" />
          <Text style={styles.title}>E-Wallet</Text>
        </View>
        <Text style={styles.balance}>₱ {Number(balance).toFixed(2)}</Text>
      </View>
      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.button} onPress={onTopUp} activeOpacity={0.8}>
          <MaterialIcons name="add-circle-outline" size={20} color="white" />
          <Text style={styles.buttonText}>Top Up</Text>
        </TouchableOpacity>
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#038A7A",
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#038A7A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
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
  buttonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
});
