import { useEffect, useRef } from "react";
import { connectSocket, disconnectSocket, getSocket } from "../services/socket";
import type { Socket } from "socket.io-client";

/**
 * Connect to Socket.IO on mount, disconnect on unmount.
 * Returns helpers to subscribe to events.
 */
export function useSocket() {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    let isMounted = true;

    const ensureConnected = async () => {
      const s = await connectSocket();
      if (isMounted) {
        socketRef.current = s;
      }
    };

    void ensureConnected();
    const interval = setInterval(() => {
      void ensureConnected();
    }, 5000);

    return () => {
      isMounted = false;
      clearInterval(interval);
      disconnectSocket();
    };
  }, []);

  return {
    getSocket,
  };
}

/**
 * Subscribe to a specific socket event. The callback is stable across re-renders.
 */
export function useSocketEvent(event: string, callback: (data: any) => void) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    const handler = (data: any) => callbackRef.current(data);

    // Check immediately and also poll briefly for connection
    const socket = getSocket();
    if (socket) {
      socket.on(event, handler);
      return () => {
        socket.off(event, handler);
      };
    }

    // Socket may not be connected yet — wait for it
    const interval = setInterval(() => {
      const s = getSocket();
      if (s) {
        s.on(event, handler);
        clearInterval(interval);
      }
    }, 500);

    return () => {
      clearInterval(interval);
      const s = getSocket();
      if (s) s.off(event, handler);
    };
  }, [event]);
}
