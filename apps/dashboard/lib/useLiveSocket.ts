import { useEffect, useRef } from "react";
import { wsUrl } from "./api";

export interface SocketMessage {
  type: "connected" | "live_event" | "command_log";
  data?: any;
}

/** Subscribes to the backend's real-time feed and auto-reconnects on drop. */
export function useLiveSocket(onMessage: (msg: SocketMessage) => void) {
  const callbackRef = useRef(onMessage);
  callbackRef.current = onMessage;

  useEffect(() => {
    let socket: WebSocket | null = null;
    let closedByEffect = false;
    let retryTimer: ReturnType<typeof setTimeout>;

    const connect = () => {
      socket = new WebSocket(wsUrl());
      socket.onmessage = (event) => {
        try {
          callbackRef.current(JSON.parse(event.data));
        } catch {
          // ignore malformed frames
        }
      };
      socket.onclose = () => {
        if (!closedByEffect) retryTimer = setTimeout(connect, 2000);
      };
      socket.onerror = () => socket?.close();
    };

    connect();
    return () => {
      closedByEffect = true;
      clearTimeout(retryTimer);
      socket?.close();
    };
  }, []);
}
