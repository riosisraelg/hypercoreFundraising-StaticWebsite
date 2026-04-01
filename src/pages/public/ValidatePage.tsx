import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { api, ApiError } from "../../lib/api";
import "./ValidatePage.css";

interface TicketValidationResponse {
  id: string;
  folio: string;
  status: "active" | "cancelled";
  full_name: string;
}

export default function ValidatePage() {
  const { ticketId } = useParams<{ ticketId: string }>();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<TicketValidationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!ticketId);
  const [searchId, setSearchId] = useState("");

  useEffect(() => {
    async function validateTicket() {
      if (!ticketId) {
        return;
      }
      try {
        const data = await api.get<TicketValidationResponse>(`/tickets/${ticketId}/validate`, false);
        setTicket(data);
      } catch (err: unknown) {
        if (err instanceof ApiError && err.status === 404) {
          setError("Boleto no encontrado.");
        } else {
          setError("Error validando el boleto. Intenta de nuevo.");
        }
      } finally {
        setLoading(false);
      }
    }

    if (ticketId) {
      validateTicket();
    }
  }, [ticketId]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (searchId.trim()) {
      navigate(`/validate/${searchId.trim()}`);
    }
  }

  if (!ticketId) {
    return (
      <main className="validate-page">
        <div className="validate-container search">
          <h1>Validar Boleto</h1>
          <p className="detail" style={{ marginBottom: "1.5rem" }}>
            Ingresa o escanea el código (UUID) de tu boleto para consultar su validez y detalles.
          </p>
          <form className="validate-search-form" onSubmit={handleSearch}>
            <input
              type="text"
              className="input-field"
              placeholder="Ej: f47ac10b-58cc-4372-..."
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              required
            />
            <button type="submit" className="btn-primary" style={{ marginTop: "1rem", width: "100%" }}>
              Verificar Estado
            </button>
          </form>
          <Link to="/" className="btn-ghost" style={{ marginTop: "1rem" }}>Regresar al Sorteo</Link>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="validate-page">
        <div className="validate-container loading">
          <svg className="spinner" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="path"></circle>
          </svg>
          <p>Validando boleto...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="validate-page">
        <div className="validate-container error">
          <div className="status-icon">⚠️</div>
          <h1>Boleto Inválido</h1>
          <p className="detail">{error}</p>
          <Link to="/" className="btn-primary">Ir al Inicio</Link>
        </div>
      </main>
    );
  }

  if (ticket) {
    const isActive = ticket.status === "active";
    return (
      <main className="validate-page">
        <div className={`validate-container ${isActive ? "active" : "cancelled"}`}>
          <div className="status-badge">
            {isActive ? "✓ BOLETO VÁLIDO" : "✗ BOLETO CANCELADO"}
          </div>
          <div className="ticket-details">
            <div className="detail-row">
              <span className="label">FOLIO</span>
              <span className="value folio">{ticket.folio}</span>
            </div>
            <div className="detail-row">
              <span className="label">PARTICIPANTE</span>
              <span className="value">{ticket.full_name}</span>
            </div>
          </div>
          <Link to="/" className="btn-primary" style={{ marginTop: '2rem' }}>Regresar al Sorteo</Link>
        </div>
      </main>
    );
  }

  return null;
}
