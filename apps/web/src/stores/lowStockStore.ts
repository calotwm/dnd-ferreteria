import { create } from "zustand";

export interface LowStockNotification {
  productId: string;
  name: string;
  stock: number;
}

interface LowStockState {
  unread: number;
  /** Product ids already alerted this session (dedupe per crossing). */
  seenIds: Set<string>;
  incrementUnread: (payload: LowStockNotification) => void;
  resetUnread: () => void;
}

/**
 * Session-scoped, in-memory unread low-stock counter. Each product alerts at
 * most once per session; `resetUnread` only clears the badge count.
 */
export const useLowStockStore = create<LowStockState>((set) => ({
  unread: 0,
  seenIds: new Set<string>(),

  incrementUnread: (payload) =>
    set((state) => {
      if (state.seenIds.has(payload.productId)) return {};
      const seenIds = new Set(state.seenIds);
      seenIds.add(payload.productId);
      return { unread: state.unread + 1, seenIds };
    }),

  resetUnread: () => set({ unread: 0 }),
}));
