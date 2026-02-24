import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import * as SecureStore from "expo-secure-store";

type ViewMode = "driver" | "host";

interface ViewModeContextType {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => Promise<void>;
  isLoading: boolean;
}

const ViewModeContext = createContext<ViewModeContextType | undefined>(undefined);

export function ViewModeProvider({ children }: { children: React.ReactNode }) {
  const [viewMode, setViewModeState] = useState<ViewMode>("driver");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    SecureStore.getItemAsync("viewMode").then((stored) => {
      if (stored === "host") setViewModeState("host");
      setIsLoading(false);
    });
  }, []);

  const setViewMode = useCallback(async (mode: ViewMode) => {
    setViewModeState(mode);
    await SecureStore.setItemAsync("viewMode", mode);
  }, []);

  return (
    <ViewModeContext.Provider value={{ viewMode, setViewMode, isLoading }}>
      {children}
    </ViewModeContext.Provider>
  );
}

export function useViewMode() {
  const context = useContext(ViewModeContext);
  if (!context) throw new Error("useViewMode must be used within ViewModeProvider");
  return context;
}
