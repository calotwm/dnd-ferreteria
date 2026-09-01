import { getAccessToken } from "../api/client";

export default function ExportButton({ label = "Exportar" }: { label?: string }) {
  const handleExport = async () => {
    const res = await fetch("/stats/export", {
      headers: { Authorization: `Bearer ${getAccessToken()}` },
      credentials: "include",
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ventas.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button onClick={handleExport} className="btn-secondary">
      <span className="material-symbols-outlined text-[18px]">download</span>
      {label}
    </button>
  );
}
