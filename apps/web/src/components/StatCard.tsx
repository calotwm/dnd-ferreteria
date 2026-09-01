interface StatCardProps {
  label: string;
  value: string;
  icon: string;
  delta?: string;
}

export default function StatCard({ label, value, icon, delta }: StatCardProps) {
  return (
    <div className="bg-surface rounded-lg p-6 border border-outline-variant flex flex-col justify-between h-32 relative overflow-hidden group hover:border-primary transition-colors">
      <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/5 rounded-full blur-xl group-hover:bg-primary/10 transition-all" />
      <span className="text-on-surface-variant font-label-caps text-label-caps flex items-center gap-1">
        <span className="material-symbols-outlined text-[16px]">{icon}</span>
        {label}
      </span>
      <div className="flex items-baseline gap-2">
        <span className="font-display-lg text-display-lg text-on-surface font-data-mono">{value}</span>
        {delta && <span className="text-primary text-body-sm font-data-mono">{delta}</span>}
      </div>
    </div>
  );
}
