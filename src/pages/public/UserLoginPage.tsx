import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { api } from "../../lib/api";

export default function UserLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.post<{ access: string }>("/auth/login", {
        username: email,
        password,
      });
      localStorage.setItem("hypercore_admin_token", res.access);
      
      const from = (location.state as any)?.from?.pathname || "/user/dashboard";
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err?.data?.detail || "Error al iniciar sesión. Verifica tus credenciales.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-layout">
      <div className="login-card">
        <h1>Bienvenido</h1>
        <p className="login-subtitle">Ingresa para gestionar tus folios y boletos</p>

        {error && <div className="form-error">{error}</div>}

        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group">
            <label className="label-meta">Correo Electrónico</label>
            <input
              type="email"
              className="input-field"
              placeholder="tu@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="label-meta">Contraseña</label>
            <input
              type="password"
              className="input-field"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn-primary login-btn" disabled={loading}>
            {loading ? "Cargando..." : "Ingresar"}
          </button>
        </form>

        <div style={{ marginTop: "2rem", textAlign: "center", fontSize: "0.9rem" }}>
          <p style={{ color: "rgba(255,255,255,0.6)" }}>
            ¿No tienes una cuenta?{" "}
            <Link to="/register" style={{ color: "var(--primary)", fontWeight: "600" }}>
              Regístrate aquí
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
