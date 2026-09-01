import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../api/client";
import Money from "./Money";

interface Overdue {
  id: string;
  customerName: string;
  customerPhone: string | null;
  remainingCents: number;
  totalCents: number;
  dueAt: string | null;
}

export default function DebtReminders() {
  const { data } = useQuery({
    queryKey: ["reminders"],
    queryFn: () => apiFetch<Overdue[]>("/reminders"),
  });

  if (!data || data.length === 0) {
    return <p className="text-on-surface-variant text-body-sm">Sin deudas vencidas.</p>;
  }

  return (
    <ul className="divide-y divide-outline-variant card">
      {data.map((d) => (
        <li key={d.id} className="px-4 py-3 flex justify-between items-center">
          <div>
            <p className="text-on-surface">{d.customerName}</p>
            {d.customerPhone && (
              <p className="text-on-surface-variant text-body-sm font-data-mono">{d.customerPhone}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-error font-data-mono">
              <Money value={d.remainingCents} />
            </p>
            {d.dueAt && (
              <p className="text-on-surface-variant text-body-sm">
                vence {new Date(d.dueAt).toLocaleDateString("es-AR")}
              </p>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
