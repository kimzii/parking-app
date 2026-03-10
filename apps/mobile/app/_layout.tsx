import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import * as SplashScreen from "expo-splash-screen";
import { ViewModeProvider } from "../src/contexts/ViewModeContext";

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    // Hide splash screen after layout is ready
    SplashScreen.hideAsync();
  }, []);

  return (
    <ViewModeProvider>
      <Stack screenOptions={{ headerShown: false }} />
      <StatusBar style="auto" />
    </ViewModeProvider>
  );
}
