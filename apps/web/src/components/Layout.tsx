import { Outlet } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import Sidebar from "./Sidebar";
import LowStockBell from "./LowStockBell";
import { useRealtimeSync } from "../lib/realtime";
import { getSocket } from "../lib/socket";

export default function Layout() {
  const queryClient = useQueryClient();
  useRealtimeSync(queryClient, getSocket());

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background">
      {/* Top nav (mobile) */}
      <nav className="md:hidden bg-surface border-b border-outline-variant w-full sticky top-0 z-50 flex justify-between items-center px-margin-mobile h-touch-target">
        <div className="flex items-center gap-gutter">
          <span className="material-symbols-outlined text-primary">hardware</span>
          <span className="font-headline-lg-mobile text-headline-lg-mobile font-bold text-primary">
            DND Ferretería
          </span>
        </div>
        <div className="flex items-center gap-1">
          <LowStockBell />
          <span className="material-symbols-outlined text-on-surface-variant">account_circle</span>
        </div>
      </nav>

      <Sidebar />

      <main className="flex-1 md:ml-64 flex flex-col min-h-screen overflow-hidden bg-background">
        <div className="flex-1 overflow-y-auto p-margin-mobile md:p-margin-desktop">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
