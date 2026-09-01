import { useEffect } from "react";
import type { QueryClient } from "@tanstack/react-query";
import type { Socket } from "socket.io-client";
import { subscribe } from "./socket";
import { useLowStockStore } from "../stores/lowStockStore";

/**
 * Event → TanStack Query prefixes to invalidate (prefix match, `exact: false`).
 * Source of truth: design `Event→Query-Key Map`.
 */
const EVENT_INVALIDATIONS: Record<string, string[][]> = {
  "sale.created": [["sales"], ["stats"], ["cash-session"], ["products"]],
  "inventory.changed": [["products"], ["catalog-items"]],
  "cash.session": [["cash-session"]],
  "fiado.paid": [["customers"], ["debts"]],
};

interface LowStockPayload {
  productId: string;
  name: string;
  stock: number;
}

/**
 * Wire the dormant socket `subscribe()` to TanStack Query. Mounted once in
 * `Layout` (inside RequireAuth, after the token is set). Invalidates cached
 * queries per event and refetches active queries on reconnect.
 */
export function useRealtimeSync(queryClient: QueryClient, socket: Socket): void {
  const incrementUnread = useLowStockStore((s) => s.incrementUnread);

  useEffect(() => {
    const unsubscribers = Object.entries(EVENT_INVALIDATIONS).map(([event, prefixes]) =>
      subscribe(event, () => {
        for (const prefix of prefixes) {
          void queryClient.invalidateQueries({ queryKey: prefix, exact: false });
        }
      }),
    );

    // low_stock → increment the bell's unread counter (deduped per product).
    const unsubLowStock = subscribe("low_stock", (payload) => {
      const p = payload as LowStockPayload;
      if (p && typeof p.productId === "string" && typeof p.stock === "number") {
        incrementUnread({ productId: p.productId, name: p.name ?? "", stock: p.stock });
      }
    });

    const onConnect = () => {
      // Refetch active, stale queries on (re)connect. `stale` avoids re-fetching
      // just-populated queries on the initial connection.
      void queryClient.refetchQueries({ type: "active", stale: true });
    };
    socket.on("connect", onConnect);

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
      unsubLowStock();
      socket.off("connect", onConnect);
    };
  }, [queryClient, socket, incrementUnread]);
}
