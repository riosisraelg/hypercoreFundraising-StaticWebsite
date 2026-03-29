import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api, setToken, ApiError } from "../../lib/api";

interface LoginResponse {
  access: string;
  refresh: string;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await api.post<LoginResponse>("/auth/login", {
        username,
        password,
      });
      setToken(data.access);
      navigate("/admin/dashboard", { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError("Credenciales inválidas. Intenta de nuevo.");
      } else {
        setError("Error de conexión. Intenta más tarde.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-layout">
      <div className="login-card">
        <h1>HyperCore Admin</h1>
        <p className="login-subtitle">Inicia sesión para continuar</p>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="username" className="label-meta">
              Usuario
            </label>
            <input
              id="username"
              className="input-field"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Tu nombre de usuario"
              autoComplete="username"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password" className="label-meta">
              Contraseña
            </label>
            <input
              id="password"
              className="input-field"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Tu contraseña"
              autoComplete="current-password"
              required
            />
          </div>

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="btn-primary login-btn" disabled={loading}>
            {loading ? "Ingresando…" : "Iniciar sesión"}
          </button>
        </form>
      </div>
    </div>
  );
}
