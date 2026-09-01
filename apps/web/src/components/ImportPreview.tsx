import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../api/client";

interface PreviewResult {
  total: number;
  skipped: number;
  errors: Array<{ row: number; reason: string }>;
  preview: Array<Record<string, unknown>>;
}

interface CommitResult {
  total: number;
  imported: number;
  skipped: number;
  errors: Array<{ row: number; reason: string }>;
}

export default function ImportPreview() {
  const queryClient = useQueryClient();
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [rawRows, setRawRows] = useState<Array<Record<string, unknown>> | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setMessage(null);
    const form = new FormData();
    form.append("file", file);
    const result = await apiFetch<PreviewResult>("/inventory/import/preview", {
      method: "POST",
      body: form,
    });
    setPreview(result);
    // Re-parse the same file locally so the client can commit validated rows.
    setRawRows(result.preview);
  };

  const commit = async () => {
    if (!rawRows) return;
    setBusy(true);
    try {
      const result = await apiFetch<CommitResult>("/inventory/import/commit", {
        method: "POST",
        body: JSON.stringify({ rows: rawRows }),
      });
      setMessage(
        `Importación completada: ${result.imported} productos, ${result.skipped} omitidos.`,
      );
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setPreview(null);
      setRawRows(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card p-6 flex flex-col gap-4">
      <div>
        <h3 className="font-title-md text-title-md text-on-surface mb-2">Importar desde Excel</h3>
        <p className="text-on-surface-variant text-body-sm mb-2">
          Columnas: nombre, codigo_barras, costo, precio, categoria, stock
        </p>
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          className="text-on-surface-variant text-body-sm"
        />
      </div>

      {preview && (
        <div className="flex flex-col gap-2">
          <p className="text-on-surface-variant text-body-sm">
            {preview.total} filas · {preview.errors.length} con error
          </p>
          {preview.errors.length > 0 && (
            <ul className="text-error text-body-sm">
              {preview.errors.map((e, i) => (
                <li key={i}>
                  Fila {e.row}: {e.reason}
                </li>
              ))}
            </ul>
          )}
          <div className="flex gap-2">
            <button onClick={commit} disabled={busy} className="btn-primary">
              {busy ? "Importando…" : "Confirmar importación"}
            </button>
            <button onClick={() => setPreview(null)} className="btn-secondary">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {message && <p className="text-primary text-body-sm">{message}</p>}
    </div>
  );
}
