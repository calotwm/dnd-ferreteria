import { formatMoney } from "@dnd/shared";

interface ShareButtonProps {
  name: string;
  priceCents: number;
  /** Icon-only variant for tight panels (catalog/POS picker). */
  compact?: boolean;
}

export default function ShareButton({ name, priceCents, compact = false }: ShareButtonProps) {
  const share = async () => {
    const text = `${name} — ${formatMoney(priceCents)}\nDND Ferretería`;
    if (navigator.share) {
      try {
        await navigator.share({ title: name, text });
        return;
      } catch {
        // user cancelled — fall through
      }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  if (compact) {
    return (
      <button
        type="button"
        onClick={share}
        aria-label={`Compartir ${name}`}
        className="bg-surface-container-lowest/90 border border-outline-variant rounded-full h-9 w-9 inline-flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-surface-container-high transition-colors"
      >
        <span className="material-symbols-outlined text-[18px]">share</span>
      </button>
    );
  }

  return (
    <button onClick={share} className="btn-secondary h-10 px-3">
      <span className="material-symbols-outlined text-[18px]">share</span>
      Compartir
    </button>
  );
}
