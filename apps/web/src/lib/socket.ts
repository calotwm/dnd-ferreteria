import { io, type Socket } from "socket.io-client";
import { getAccessToken } from "../api/client";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const s = io("/", {
      autoConnect: true,
      // Callback form reads the freshest token on every (re)connect handshake.
      // A static `auth: { token }` closure would go stale after the 15m JWT expiry.
      auth: (cb) => cb({ token: getAccessToken() }),
    });

    // Unauthorized (expired/rotated token): drop the socket and reconnect so the
    // next handshake re-reads the token via the callback above.
    s.on("connect_error", (err) => {
      if (err.message === "unauthorized") {
        s.disconnect();
        s.connect();
      }
    });

    socket = s;
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
