import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import "./HomePage.css"; // Reuse styling for simplicity

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.post("/auth/register", {
        email,
        password,
        full_name: fullName,
        phone,
      });
      // Optionally login right after registering
      const loginRes = await api.post<{ access: string }>("/auth/login", {
        username: email,
        password,
      });
      localStorage.setItem("hypercore_admin_token", loginRes.access);
      navigate("/user/dashboard");
    } catch (err: any) {
      setError(err?.data?.detail || err?.data?.email?.[0] || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="home-container">
      <header className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">Regístrate</h1>
          <p className="hero-subtitle">Crea una cuenta para reservar tus boletos</p>
        </div>
      </header>
      
      <main className="main-content" style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
        <form onSubmit={handleRegister} className="form-card-dark" style={{ width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {error && <div style={{ color: 'var(--error)', marginBottom: '1rem' }}>{error}</div>}
          
          <input type="text" placeholder="Nombre Completo" value={fullName} onChange={(e) => setFullName(e.target.value)} required className="input-field" />
          <input type="email" placeholder="Correo Electrónico" value={email} onChange={(e) => setEmail(e.target.value)} required className="input-field" />
          <input type="text" placeholder="Teléfono" value={phone} onChange={(e) => setPhone(e.target.value)} required className="input-field" />
          <input type="password" placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} required className="input-field" />
          
          <div style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.6)", textAlign: "center", lineHeight: "1.4" }}>
            Al registrarte, confirmas que aceptas recibir notificaciones en este correo electrónico con información importante sobre tu boleto y el sorteo.
          </div>

          <button type="submit" disabled={loading} className="btn-primary" style={{ marginTop: "0.5rem" }}>
            {loading ? "Registrando..." : "Crear Cuenta y Continuar"}
          </button>
          
          <p style={{ textAlign: 'center', marginTop: '1rem' }}>
            ¿Ya tienes cuenta? <Link to="/admin/login">Inicia sesión aquí</Link>
          </p>
        </form>
      </main>
    </div>
  );
}
