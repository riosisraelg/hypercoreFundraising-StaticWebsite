import { useState, type FormEvent } from "react";
import { api, ApiError } from "../../lib/api";

const API_BASE = "/api";

interface Ticket {
  id: string;
  folio: string;
  full_name: string;
  phone: string;
  status: string;
  download_links: {
    pdf: string;
    wallet: string;
    google_wallet: string;
  };
}

export default function TicketNewPage() {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<Ticket | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const ticket = await api.post<Ticket>(
        "/tickets",
        { full_name: fullName, phone },
        true
      );
      setCreated(ticket);
      setFullName("");
      setPhone("");
    } catch (err) {
      if (err instanceof ApiError) {
        const data = err.data as Record<string, string[]>;
        const msgs = Object.values(data).flat().join(" ");
        setError(msgs || "Error al registrar el boleto.");
      } else {
        setError("Error de conexión.");
      }
    } finally {
      setLoading(false);
    }
  }

  function handleDownloadPdf() {
    if (!created) return;
    const token = localStorage.getItem("hypercore_admin_token");
    const url = `${API_BASE}/tickets/${created.id}/download/pdf`;
    // Use fetch with auth header for authenticated download
    fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.blob())
      .then((blob) => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `ticket-${created.folio}.pdf`;
        a.click();
        URL.revokeObjectURL(a.href);
      });
  }

  function registerAnother() {
    setCreated(null);
  }

  return (
    <div className="admin-ticket-new">
      <h1 className="page-heading">Registrar Boleto</h1>

      {created ? (
        <div className="card-elevated ticket-success">
          <h2 className="page-subheading">Boleto registrado</h2>
          <div className="ticket-detail-grid">
            <div>
              <span className="label-meta">Folio</span>
              <span className="ticket-folio">{created.folio}</span>
            </div>
            <div>
              <span className="label-meta">Nombre</span>
              <span>{created.full_name}</span>
            </div>
            <div>
              <span className="label-meta">Teléfono</span>
              <span>{created.phone}</span>
            </div>
          </div>

          <div className="download-actions">
            <button className="btn-primary" onClick={handleDownloadPdf} type="button">
              Descargar PDF
            </button>
          </div>

          <button className="btn-accent" onClick={registerAnother} type="button">
            Registrar otro boleto
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="card-elevated ticket-form">
          <div className="form-group">
            <label htmlFor="full_name" className="label-meta">
              Nombre completo
            </label>
            <input
              id="full_name"
              className="input-field"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nombre del comprador"
              maxLength={200}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="phone" className="label-meta">
              Teléfono
            </label>
            <input
              id="phone"
              className="input-field"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+52 123 456 7890"
              required
            />
          </div>

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Registrando…" : "Registrar boleto"}
          </button>
        </form>
      )}
    </div>
  );
}
