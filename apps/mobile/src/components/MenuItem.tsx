import React from "react";
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  GestureResponderEvent,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

interface MenuItemProps {
  label: string;
  onPress?: (event: GestureResponderEvent) => void;
  style?: object;
}

const MenuItem: React.FC<MenuItemProps> = ({ label, onPress, style }) => (
  <TouchableOpacity style={[styles.menuItem, style]} onPress={onPress}>
    <View style={styles.menuItemRow}>
      <Text style={styles.menuItemText}>{label}</Text>
      <MaterialIcons name="keyboard-arrow-right" size={20} color="black" />
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  menuItem: {
    paddingVertical: 14,
    marginBottom: 12,
  },
  menuItemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  menuItemText: {
    color: "#222",
    fontSize: 16,
  },
});

export default MenuItem;
