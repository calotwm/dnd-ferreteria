import { useState } from "react";
import { getAccessToken } from "../api/client";

interface ExportButtonProps {
  endpoint?: string;
  filename?: string;
  label?: string;
}

export default function ExportButton({
  endpoint = "/stats/export",
  filename = "ventas.xlsx",
  label = "Exportar",
}: ExportButtonProps) {
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    setError(null);
    try {
      const res = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${getAccessToken()}` },
        credentials: "include",
      });
      if (!res.ok) {
        setError("No se pudo exportar. Verifique sus permisos.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("No se pudo exportar. Verifique su conexión.");
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button onClick={handleExport} className="btn-secondary">
        <span className="material-symbols-outlined text-[18px]">download</span>
        {label}
      </button>
      {error && (
        <p className="text-error text-body-sm" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
