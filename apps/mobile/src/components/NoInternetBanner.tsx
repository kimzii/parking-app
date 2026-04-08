import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import NetInfo from "@react-native-community/netinfo";

export default function NoInternetBanner() {
  const [isConnected, setIsConnected] = useState<boolean | null>(true);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(state.isConnected);
    });
    return () => unsubscribe();
  }, []);

  const handleRetry = async () => {
    setChecking(true);
    const state = await NetInfo.fetch();
    setIsConnected(state.isConnected);
    setChecking(false);
  };

  if (isConnected !== false) return null;

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <MaterialIcons name="wifi-off" size={48} color="#D4501E" />
          </View>
          <Text style={styles.title}>No Internet Connection</Text>
          <Text style={styles.message}>
            Please check your Wi-Fi or mobile data and try again.
          </Text>
          <TouchableOpacity
            style={[styles.retryBtn, checking && styles.retryBtnDisabled]}
            onPress={handleRetry}
            disabled={checking}
            activeOpacity={0.8}
          >
            <MaterialIcons
              name="refresh"
              size={20}
              color="#fff"
            />
            <Text style={styles.retryText}>
              {checking ? "Checking..." : "Try Again"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: "#FFF0EC",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#232230",
    marginBottom: 8,
    textAlign: "center",
  },
  message: {
    fontSize: 14,
    color: "#A09A94",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#D4501E",
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 14,
    width: "100%",
  },
  retryBtnDisabled: {
    backgroundColor: "#E8A08A",
  },
  retryText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
});
