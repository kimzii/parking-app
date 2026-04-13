import { io, Socket } from "socket.io-client";
import * as SecureStore from "expo-secure-store";

const API_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

let socket: Socket | null = null;

export async function connectSocket(): Promise<Socket | null> {
  if (socket) {
    if (!socket.connected) {
      socket.connect();
    }
    return socket;
  }

  try {
    const token = await SecureStore.getItemAsync("accessToken");
    if (!token) return null;

    socket = io(`${API_URL}/notifications`, {
      auth: { token },
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 3000,
    });

    socket.on("connect", () => {
      console.log("Socket connected:", socket?.id);
    });

    socket.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason);
    });

    socket.on("connect_error", (err) => {
      console.warn("Socket connection error:", err.message);
    });

    return socket;
  } catch (err) {
    console.warn("Failed to connect socket:", err);
    return null;
  }
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
