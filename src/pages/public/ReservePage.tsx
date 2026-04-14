import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import "./HomePage.css"; // Reuse styling 

export default function ReservePage() {
  const { folios } = useParams<{ folios: string }>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const folioList = folios ? folios.split(",") : [];
  const totalPrice = folioList.length * 200;

  const handleReserve = async () => {
    setLoading(true);
    setError(null);
    try {
      // API expects folio_numbers as array of ints, strip "HC-"
      const nums = folioList.map(f => parseInt(f.replace("HC-", ""), 10));
      await api.post("/tickets/reserve", { folio_numbers: nums }, true);
      navigate("/user/dashboard");
    } catch (err: any) {
      setError(err?.data?.detail || "Error reservando. Algún boleto puede estar ya apartado.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="home-page" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="card-elevated" style={{ maxWidth: "500px", width: "100%", padding: "2rem", textAlign: "center" }}>
        <h2 className="section-title">Asegura tus boletos</h2>
        <p style={{ margin: "1rem 0" }}>Seleccionaste {folioList.length} folio(s):</p>
        <h1 style={{ fontSize: "2rem", color: "var(--primary)", marginBottom: "0.5rem" }}>
          {folioList.join(", ")}
        </h1>
        <p style={{ fontSize: "1.2rem", fontWeight: "bold", marginBottom: "1rem", color: "var(--on-surface)" }}>
          Total a pagar: ${totalPrice.toLocaleString("es-MX")} MXN
        </p>
        
        {error && <div style={{ color: "red", marginBottom: "1rem", fontWeight: "bold" }}>{error}</div>}
        
        <div style={{ background: "rgba(255,193,7,0.1)", borderLeft: "4px solid #ffc107", padding: "1rem", textAlign: "left", marginBottom: "2rem", borderRadius: "0 4px 4px 0" }}>
          <p style={{ margin: "0 0 0.5rem 0", fontWeight: "bold", color: "#ffc107" }}>⚠️ Importante: Tiempo Límite</p>
          <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--on-surface-variant)" }}>
            Al reservar, tendrás exactamente <strong>24 horas</strong> para realizar tu pago por transferencia y enviar el comprobante desde tu Perfil. Te enviaremos un recibo por correo electrónico confirmando tu reservación.
          </p>
        </div>

        <button 
          onClick={handleReserve}
          className="btn-primary" 
          disabled={loading}
          style={{ width: "100%", fontSize: "1.2rem", padding: "1rem" }}
        >
          {loading ? "Procesando..." : "Confirmar Reservación"}
        </button>

        <button 
          onClick={() => navigate("/")}
          className="btn-ghost" 
          disabled={loading}
          style={{ width: "100%", marginTop: "1rem" }}
        >
          Volver a la tabla
        </button>
      </div>
    </div>
  );
}
