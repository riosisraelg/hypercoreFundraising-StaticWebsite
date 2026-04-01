import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
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
  const [ticket, setTicket] = useState<TicketValidationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function validateTicket() {
      if (!ticketId) {
        setError("Invalid ticket ID.");
        setLoading(false);
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

    validateTicket();
  }, [ticketId]);

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
