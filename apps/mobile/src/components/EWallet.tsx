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
      <Text style={styles.title}>E-Wallet</Text>
      <Text style={styles.balance}>₱ {balance.toFixed(2)}</Text>
      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.button} onPress={onTopUp}>
          <MaterialIcons name="add-circle-outline" size={24} color="white" />
          <Text style={styles.buttonText}>Top Up</Text>
        </TouchableOpacity>
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#038A7A",
    borderRadius: 16,
    overflow: "hidden",
    paddingTop: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  title: {
    fontSize: 16,
    paddingHorizontal: 16,
    color: "#fff",
    marginBottom: 8,
  },
  balance: {
    fontSize: 32,
    fontWeight: "bold",
    paddingHorizontal: 16,
    color: "#fff",
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  button: {
    flex: 1,
    backgroundColor: "#11796F",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderBottomEndRadius: 16,
    borderBottomStartRadius: 16,
    marginHorizontal: 4,
  },
  withdrawButton: {
    backgroundColor: "#90CAF9",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
