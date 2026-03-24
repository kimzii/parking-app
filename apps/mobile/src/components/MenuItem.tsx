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
  icon?: keyof typeof MaterialIcons.glyphMap;
  iconBg?: string;
  iconColor?: string;
  onPress?: (event: GestureResponderEvent) => void;
  style?: object;
}

const MenuItem: React.FC<MenuItemProps> = ({
  label,
  icon = "keyboard-arrow-right",
  iconBg = "#F2F2F7",
  iconColor = "#A09A94",
  onPress,
  style,
}) => (
  <TouchableOpacity
    style={[styles.menuItem, style]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={styles.leftSide}>
      <View style={[styles.iconBg, { backgroundColor: iconBg }]}>
        <MaterialIcons name={icon} size={18} color={iconColor} />
      </View>
      <Text style={styles.menuItemText}>{label}</Text>
    </View>
    <MaterialIcons name="chevron-right" size={20} color="#C7C7CC" />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  leftSide: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconBg: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  menuItemText: {
    color: "#232230",
    fontSize: 15,
    fontWeight: "600",
  },
});

export default MenuItem;
