import { formatMoney } from "@dnd/shared";
import "../styles/print.css";

export interface ReceiptData {
  number: string;
  branchName: string;
  sellerName: string;
  customerName: string | null;
  paymentMethod: string | null;
  createdAt: string;
  items: Array<{ name: string; qty: number; unitPriceCents: number }>;
  discountCents: number;
  totalCents: number;
}

const PAYMENT_LABELS: Record<string, string> = {
  EFECTIVO: "Efectivo",
  TARJETA: "Tarjeta",
  TRANSFERENCIA: "Transferencia",
  FIADO: "Fiado",
};

export default function Receipt({ receipt }: { receipt: ReceiptData }) {
  const print = () => window.print();

  const share = async () => {
    const lines = [
      "DND Ferretería",
      `Comprobante ${receipt.number}`,
      receipt.items.map((i) => `${i.qty}× ${i.name}  ${formatMoney(i.unitPriceCents)}`).join("\n"),
      `Total: ${formatMoney(receipt.totalCents)}`,
      "Comprobante no fiscal",
    ].join("\n");

    if (navigator.share) {
      try {
        await navigator.share({ title: "Comprobante", text: lines });
        return;
      } catch {
        // fall through to WhatsApp
      }
    }
    const url = `https://wa.me/?text=${encodeURIComponent(lines)}`;
    window.open(url, "_blank");
  };

  return (
    <div className="card p-6 flex flex-col gap-4">
      <div id="receipt-print" className="mx-auto bg-white p-4 rounded text-black">
        <div className="text-center mb-2">
          <p className="font-bold">DND Ferretería</p>
          <p>{receipt.branchName}</p>
          <p className="text-sm">{receipt.number}</p>
          <p className="text-sm">{new Date(receipt.createdAt).toLocaleString("es-AR")}</p>
        </div>

        <table className="w-full text-sm mb-2">
          <tbody>
            {receipt.items.map((item, i) => (
              <tr key={i}>
                <td>{item.qty}×</td>
                <td className="text-left">{item.name}</td>
                <td className="text-right">{formatMoney(item.unitPriceCents * item.qty)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {receipt.discountCents > 0 && (
          <p className="text-sm text-right">Descuento: {formatMoney(receipt.discountCents)}</p>
        )}
        <p className="font-bold text-right border-t border-dashed pt-1">
          TOTAL: {formatMoney(receipt.totalCents)}
        </p>
        <p className="text-sm">Pago: {PAYMENT_LABELS[receipt.paymentMethod ?? ""] ?? "—"}</p>
        {receipt.customerName && <p className="text-sm">Cliente: {receipt.customerName}</p>}

        <p className="text-center text-xs mt-3">Comprobante no fiscal</p>
      </div>

      <div className="flex gap-2">
        <button onClick={print} className="btn-secondary flex-1">
          <span className="material-symbols-outlined">print</span>
          Imprimir
        </button>
        <button onClick={share} className="btn-secondary flex-1">
          <span className="material-symbols-outlined">share</span>
          Compartir
        </button>
      </div>
    </div>
  );
}
