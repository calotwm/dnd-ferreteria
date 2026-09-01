import { io, type Socket } from "socket.io-client";
import { getAccessToken } from "../api/client";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io("/", {
      autoConnect: true,
      auth: { token: getAccessToken() },
    });
  }
  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}

/**
 * Subscribe to a realtime event and re-sync on reconnect.
 * The client refetches invalidated queries on `reconnect`.
 */
export function subscribe(event: string, handler: (payload: unknown) => void): () => void {
  const s = getSocket();
  s.on(event, handler);
  return () => {
    s.off(event, handler);
  };
}
