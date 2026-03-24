import React from "react";
import { TouchableOpacity, Text, StyleSheet, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

interface BecomeAHostButtonProps {
  onPress: () => void;
  style?: object;
}

const BecomeAHostButton: React.FC<BecomeAHostButtonProps> = ({
  onPress,
  style,
}) => {
  return (
    <TouchableOpacity
      style={[styles.button, style]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={styles.iconContainer}>
        <MaterialIcons name="home-work" size={20} color="#fff" />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.text}>Become a Host</Text>
        <Text style={styles.subtext}>List your parking space</Text>
      </View>
      <MaterialIcons name="chevron-right" size={22} color="rgba(255,255,255,0.5)" />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#D4501E",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 18,
    shadowColor: "#D4501E",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    width: "100%",
    elevation: 4,
  },
  iconContainer: {
    marginRight: 14,
    backgroundColor: "rgba(0,0,0,0.15)",
    borderRadius: 12,
    padding: 10,
  },
  textContainer: {
    flex: 1,
  },
  text: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  subtext: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 12,
    marginTop: 2,
  },
});

export default BecomeAHostButton;
