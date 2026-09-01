export default function OfflineScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-margin-mobile text-center">
      <span className="material-symbols-outlined text-[64px] text-on-surface-variant">cloud_off</span>
      <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface mt-4">
        Sin conexión
      </h1>
      <p className="text-on-surface-variant mt-2 max-w-sm">
        DND Ferretería requiere conexión a internet. Vuelva a intentar cuando se restablezca la red.
      </p>
      <button onClick={() => window.location.reload()} className="btn-primary mt-6">
        Reintentar
      </button>
    </div>
  );
}
