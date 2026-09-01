import type { Server } from "socket.io";

let io: Server | null = null;

export function setSocketServer(server: Server): void {
  io = server;
}

export function getSocketServer(): Server | null {
  return io;
}

export type SocketEvent =
  | "inventory.changed"
  | "sale.created"
  | "cash.session"
  | "fiado.paid"
  | "low_stock";

/**
 * Emit a realtime event to a branch room (and the business-wide room).
 * Room naming: `branch:{branchId}` so terminals in the same branch sync instantly.
 */
export function emit(event: SocketEvent, payload: unknown, branchId?: string, businessId?: string): void {
  if (!io) return;
  if (businessId) io.to(`business:${businessId}`).emit(event, payload);
  if (branchId) io.to(`branch:${branchId}`).emit(event, payload);
}
