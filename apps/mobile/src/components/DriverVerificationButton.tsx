import React from "react";
import { TouchableOpacity, Text, StyleSheet, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

interface DriverVerificationButtonProps {
  onPress: () => void;
  style?: object;
}

const DriverVerificationButton: React.FC<DriverVerificationButtonProps> = ({
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
        <MaterialIcons name="verified-user" size={22} color="#fff" />
      </View>
      <Text style={styles.text}>Verify Driver Status</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#038A7A",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    width: "100%",
    elevation: 2,
  },
  iconContainer: {
    marginRight: 10,
    backgroundColor: "#027063",
    borderRadius: 8,
    padding: 6,
  },
  text: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
});

export default DriverVerificationButton;
