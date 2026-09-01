import { formatMoney } from "@dnd/shared";

interface ShareButtonProps {
  name: string;
  priceCents: number;
}

export default function ShareButton({ name, priceCents }: ShareButtonProps) {
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

  return (
    <button onClick={share} className="btn-secondary h-10 px-3">
      <span className="material-symbols-outlined text-[18px]">share</span>
      Compartir
    </button>
  );
}
