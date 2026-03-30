import { useState, type FormEvent } from "react";
import { api, ApiError } from "../../lib/api";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

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

type Mode = "single" | "range" | "pick";

export default function TicketNewPage() {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [mode, setMode] = useState<Mode>("single");
  // Single mode
  const [folioNumber, setFolioNumber] = useState("");
  // Range mode
  const [folioFrom, setFolioFrom] = useState("");
  const [folioTo, setFolioTo] = useState("");
  // Pick mode
  const [folioList, setFolioList] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<Ticket | null>(null);
  const [createdBulk, setCreatedBulk] = useState<Ticket[]>([]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    setCreated(null);
    setCreatedBulk([]);

    try {
      if (mode === "single") {
        const body: Record<string, unknown> = { full_name: fullName, phone };
        if (folioNumber.trim()) {
          body.folio_number = parseInt(folioNumber, 10);
        }
        const ticket = await api.post<Ticket>("/tickets", body, true);
        setCreated(ticket);
      } else if (mode === "range") {
        const from = parseInt(folioFrom, 10);
        const to = parseInt(folioTo, 10);
        if (isNaN(from) || isNaN(to) || from > to) {
          setError("Rango inválido.");
          setLoading(false);
          return;
        }
        const tickets = await api.post<Ticket[]>(
          "/tickets/bulk",
          { full_name: fullName, phone, folio_from: from, folio_to: to },
          true
        );
        setCreatedBulk(tickets);
      } else {
        // pick mode — parse comma-separated numbers
        const nums = folioList
          .split(",")
          .map((s) => parseInt(s.trim(), 10))
          .filter((n) => !isNaN(n));
        if (nums.length === 0) {
          setError("Ingresa al menos un número de folio.");
          setLoading(false);
          return;
        }
        const tickets = await api.post<Ticket[]>(
          "/tickets/bulk",
          { full_name: fullName, phone, folio_numbers: nums },
          true
        );
        setCreatedBulk(tickets);
      }
      setFullName("");
      setPhone("");
      setFolioNumber("");
      setFolioFrom("");
      setFolioTo("");
      setFolioList("");
    } catch (err) {
      if (err instanceof ApiError) {
        const data = err.data as Record<string, unknown>;
        const msgs = Object.values(data).flat().join(" ");
        setError(msgs || "Error al registrar.");
      } else {
        setError("Error de conexión.");
      }
    } finally {
      setLoading(false);
    }
  }

  function handleDownloadPdf(ticket: Ticket) {
    const token = localStorage.getItem("hypercore_admin_token");
    const url = `${API_BASE}/tickets/${ticket.id}/download/pdf`;
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.blob())
      .then((blob) => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `ticket-${ticket.folio}.pdf`;
        a.click();
        URL.revokeObjectURL(a.href);
      });
  }

  function registerAnother() {
    setCreated(null);
    setCreatedBulk([]);
  }

  const allCreated = created ? [created] : createdBulk;
  const hasResults = allCreated.length > 0;

  return (
    <div className="admin-ticket-new">
      <h1 className="page-heading">Registrar Boleto</h1>

      {hasResults ? (
        <div className="card-elevated ticket-success">
          <h2 className="page-subheading">
            {allCreated.length === 1
              ? "Boleto registrado"
              : `${allCreated.length} boletos registrados`}
          </h2>

          <div className="bulk-results">
            {allCreated.map((t) => (
              <div key={t.id} className="bulk-result-row">
                <span className="ticket-folio">{t.folio}</span>
                <span>{t.full_name}</span>
                <button
                  className="btn-ghost btn-sm"
                  onClick={() => handleDownloadPdf(t)}
                  type="button"
                >
                  PDF
                </button>
              </div>
            ))}
          </div>

          <button className="btn-accent" onClick={registerAnother} type="button">
            Registrar más boletos
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="card-elevated ticket-form">
          {/* Mode selector */}
          <div className="form-group">
            <span className="label-meta">Modo de registro</span>
            <div className="mode-selector">
              <button
                type="button"
                className={`mode-btn ${mode === "single" ? "active" : ""}`}
                onClick={() => setMode("single")}
              >
                Individual
              </button>
              <button
                type="button"
                className={`mode-btn ${mode === "range" ? "active" : ""}`}
                onClick={() => setMode("range")}
              >
                Rango
              </button>
              <button
                type="button"
                className={`mode-btn ${mode === "pick" ? "active" : ""}`}
                onClick={() => setMode("pick")}
              >
                Elegir folios
              </button>
            </div>
          </div>

          {/* Folio fields based on mode */}
          {mode === "single" && (
            <div className="form-group">
              <label htmlFor="folio_number" className="label-meta">
                Número de folio (opcional)
              </label>
              <input
                id="folio_number"
                className="input-field"
                type="number"
                value={folioNumber}
                onChange={(e) => setFolioNumber(e.target.value)}
                placeholder="Ej: 50 → HC-050 (vacío = automático)"
                min={1}
                max={999}
              />
            </div>
          )}

          {mode === "range" && (
            <div className="form-group-row">
              <div className="form-group">
                <label htmlFor="folio_from" className="label-meta">Desde</label>
                <input
                  id="folio_from"
                  className="input-field"
                  type="number"
                  value={folioFrom}
                  onChange={(e) => setFolioFrom(e.target.value)}
                  placeholder="1"
                  min={1}
                  max={999}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="folio_to" className="label-meta">Hasta</label>
                <input
                  id="folio_to"
                  className="input-field"
                  type="number"
                  value={folioTo}
                  onChange={(e) => setFolioTo(e.target.value)}
                  placeholder="30"
                  min={1}
                  max={999}
                  required
                />
              </div>
            </div>
          )}

          {mode === "pick" && (
            <div className="form-group">
              <label htmlFor="folio_list" className="label-meta">
                Números de folio (separados por coma)
              </label>
              <input
                id="folio_list"
                className="input-field"
                value={folioList}
                onChange={(e) => setFolioList(e.target.value)}
                placeholder="Ej: 5, 12, 47, 100"
                required
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="full_name" className="label-meta">Nombre completo</label>
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
            <label htmlFor="phone" className="label-meta">Teléfono</label>
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
            <p className="form-error" role="alert">{error}</p>
          )}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Registrando…" : mode === "single" ? "Registrar boleto" : "Registrar boletos"}
          </button>
        </form>
      )}
    </div>
  );
}
