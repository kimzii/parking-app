import { Stack, useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { TouchableOpacity } from "react-native";

export default function StackLayout() {
  const router = useRouter();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#fff" },
        headerTintColor: "#11796F",
        headerTitle: "", // Hide the title
        headerLeft: () => (
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ marginLeft: 4 }}
          >
            <MaterialIcons name="arrow-back-ios-new" size={24} color="#11796F" />
          </TouchableOpacity>
        ),
      }}
    />
  );
}
