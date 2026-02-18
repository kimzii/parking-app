import { Stack } from "expo-router";

export default function StackLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#fff" },
        headerTintColor: "#11796F",
        headerTitle: "", // Hide the title
      }}
    />
  );
}
