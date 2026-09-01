import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../api/client";

interface Step {
  step: string;
  done: boolean;
}

const STEPS: Array<{ step: string; label: string }> = [
  { step: "first_product", label: "Cargar el primer producto" },
  { step: "first_sale", label: "Realizar la primera venta" },
  { step: "first_client", label: "Registrar el primer cliente" },
  { step: "open_cash", label: "Abrir la caja del turno" },
];

export default function Onboarding() {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ["onboarding"],
    queryFn: () => apiFetch<Step[]>("/onboarding"),
  });

  const mutation = useMutation({
    mutationFn: ({ step, done }: { step: string; done: boolean }) =>
      apiFetch(`/onboarding/${step}`, { method: "PUT", body: JSON.stringify({ done }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["onboarding"] }),
  });

  const doneMap = new Map((data ?? []).map((s) => [s.step, s.done]));

  return (
    <div className="card p-6 flex flex-col gap-3">
      <h3 className="font-title-md text-title-md text-on-surface">Primeros pasos</h3>
      <ul className="flex flex-col gap-2">
        {STEPS.map((s) => {
          const done = doneMap.get(s.step) ?? false;
          return (
            <li key={s.step}>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={done}
                  onChange={(e) => mutation.mutate({ step: s.step, done: e.target.checked })}
                  className="accent-[#ffb690] h-5 w-5"
                />
                <span className={done ? "text-on-surface-variant line-through" : "text-on-surface"}>
                  {s.label}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
