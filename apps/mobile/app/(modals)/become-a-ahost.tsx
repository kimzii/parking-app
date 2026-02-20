import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function BecomeAHostModal() {
  return (
    <View style={styles.container}>
      <Text style={styles.placeholder}>Become a Host (Placeholder)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  placeholder: {
    fontSize: 20,
    color: "#888",
    fontWeight: "500",
  },
});
