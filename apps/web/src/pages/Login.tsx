import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../api/auth";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al iniciar sesión");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-margin-mobile">
      <form
        onSubmit={handleSubmit}
        className="bg-surface border border-outline-variant rounded-lg p-8 w-full max-w-md flex flex-col gap-4"
      >
        <div className="flex items-center gap-gutter mb-4">
          <span className="material-symbols-outlined text-primary text-[32px]">hardware</span>
          <h1 className="font-headline-lg-mobile text-headline-lg-mobile font-bold text-on-surface">
            DND Ferretería
          </h1>
        </div>

        <div>
          <label className="block text-label-caps font-label-caps text-on-surface-variant mb-2">
            Correo electrónico
          </label>
          <input
            className="input-field"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="usuario@dndferreteria.com"
            autoComplete="email"
            required
          />
        </div>

        <div>
          <label className="block text-label-caps font-label-caps text-on-surface-variant mb-2">
            Contraseña
          </label>
          <input
            className="input-field"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            required
          />
        </div>

        {error && (
          <p className="text-error text-body-sm" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="btn-primary w-full mt-2" disabled={busy}>
          {busy ? "Ingresando…" : "Ingresar"}
        </button>
      </form>
    </div>
  );
}
