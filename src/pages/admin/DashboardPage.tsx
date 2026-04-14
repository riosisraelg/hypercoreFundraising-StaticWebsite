import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../../lib/api";
import FolioGrid, { type TicketInfo } from "../../components/FolioGrid";

interface FolioCell {
  number: number;
  status: "available" | "sold" | "pending";
}

interface DashboardData {
  active_tickets: number;
  raffle_gross: number;
  prize_costs: number;
  raffle_net: number;
  extra_raised: number;
  total_raised: number;
  goal: number;
  raffle_goal: number;
  grid: FolioCell[];
}

interface Ticket {
  id: string;
  folio: string;
  full_name: string;
  phone: string;
  status: string;
  created_at: string;
}

const API_BASE = import.meta.env.DEV ? "/api" : "https://d3uu50tlzv08gz.cloudfront.net/api";

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [recentTickets, setRecentTickets] = useState<Ticket[]>([]);
  const [allTickets, setAllTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingExtra, setEditingExtra] = useState(false);
  const [extraAmount, setExtraAmount] = useState("");
  const [extraSaving, setExtraSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  // Reassign state
  const [reassignId, setReassignId] = useState<string | null>(null);
  const [reassignName, setReassignName] = useState("");
  const [reassignPhone, setReassignPhone] = useState("");
  const [error, setError] = useState("");

  async function loadDashboard() {
    try {
      const [dash, tickets] = await Promise.all([
        api.get<DashboardData>("/dashboard"),
        api.get<Ticket[]>("/tickets/", true),
      ]);
      setDashboard(dash);
      setAllTickets(tickets);
      setRecentTickets(
        [...tickets]
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 10)
      );
    } catch {
      /* handled by empty state */
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  async function handleSaveExtra() {
    const amount = parseInt(extraAmount, 10);
    if (isNaN(amount) || amount < 0) return;
    setExtraSaving(true);
    try {
      await api.put("/fundraising-extra", { amount }, true);
      setEditingExtra(false);
      await loadDashboard();
    } catch {
      /* silent */
    } finally {
      setExtraSaving(false);
    }
  }

  if (loading) return <p>Cargando…</p>;

  const progress = dashboard
    ? Math.min((dashboard.total_raised / dashboard.goal) * 100, 100)
    : 0;

  async function handleCancel(ticketId: string) {
    if (actionLoading) return;
    setActionLoading(ticketId);
    try {
      await api.patch(`/tickets/${ticketId}/cancel`, {}, true);
      await loadDashboard();
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReassign(e: FormEvent) {
    e.preventDefault();
    if (!reassignId || actionLoading) return;
    setError("");
    setActionLoading(reassignId);
    try {
      await api.post(
        `/tickets/${reassignId}/reassign`,
        { full_name: reassignName, phone: reassignPhone },
        true
      );
      setReassignId(null);
      setReassignName("");
      setReassignPhone("");
      await loadDashboard();
    } catch (err: unknown) {
      if (err instanceof ApiError && err.data) {
        const msgs = Object.values(err.data).flat().join(" ");
        setError(msgs as string || "Error al reasignar.");
      } else {
        setError("Error de conexión al intentar reasignar.");
      }
    } finally {
      setActionLoading(null);
    }
  }

  function handleDownloadPdf(ticketId: string, folio: string) {
    const token = localStorage.getItem("hypercore_admin_token");
    fetch(`${API_BASE}/tickets/${ticketId}/download/pdf`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) {
          if (res.status === 401) {
            alert("Tu sesion ha expirado. Inicia sesion de nuevo.");
            window.location.href = "/admin/login";
            return null;
          }
          throw new Error(`Error ${res.status}`);
        }
        return res.blob();
      })
      .then((blob) => {
        if (!blob) return;
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `ticket-${folio}.pdf`;
        a.click();
        URL.revokeObjectURL(a.href);
      })
      .catch(() => {
        alert("Error al descargar el PDF. Intenta de nuevo.");
      });
  }

  return (
    <div className="admin-dashboard">
      <h1 className="page-heading">Dashboard</h1>

      {/* Stats cards */}
      <div className="stats-grid">
        <div className="card-elevated stat-card">
          <span className="label-meta">Boletos activos</span>
          <span className="stat-value">{dashboard?.active_tickets ?? 0}</span>
        </div>
        <div className="card-elevated stat-card">
          <span className="label-meta">Bruto sorteo</span>
          <span className="stat-value">
            ${(dashboard?.raffle_gross ?? 0).toLocaleString("es-MX")}
          </span>
        </div>
        <div className="card-elevated stat-card">
          <span className="label-meta">Neto sorteo</span>
          <span className="stat-value">
            ${(dashboard?.raffle_net ?? 0).toLocaleString("es-MX")}
          </span>
        </div>
        <div className="card-elevated stat-card">
          <span className="label-meta">Otros ingresos</span>
          {editingExtra ? (
            <div className="extra-edit-row">
              <input
                type="number"
                className="input-field input-sm"
                value={extraAmount}
                onChange={(e) => setExtraAmount(e.target.value)}
                min={0}
                autoFocus
              />
              <button
                className="btn-primary btn-sm"
                onClick={handleSaveExtra}
                disabled={extraSaving}
                type="button"
              >
                {extraSaving ? "…" : "Guardar"}
              </button>
              <button
                className="btn-ghost btn-sm"
                onClick={() => setEditingExtra(false)}
                type="button"
              >
                ✕
              </button>
            </div>
          ) : (
            <div className="extra-display-row">
              <span className="stat-value">
                ${(dashboard?.extra_raised ?? 0).toLocaleString("es-MX")}
              </span>
              <button
                className="btn-ghost btn-sm"
                onClick={() => {
                  setExtraAmount(String(dashboard?.extra_raised ?? 0));
                  setEditingExtra(true);
                }}
                type="button"
              >
                Editar
              </button>
            </div>
          )}
        </div>
        <div className="card-elevated stat-card">
          <span className="label-meta">Meta total</span>
          <span className="stat-value">
            ${(dashboard?.goal ?? 0).toLocaleString("es-MX")}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="card progress-section">
        <div className="progress-header">
          <span className="label-meta">Progreso total</span>
          <span className="label-meta">{progress.toFixed(1)}%</span>
        </div>
        <div className="progress-bar-stacked-admin">
          <div
            className="progress-segment progress-raffle"
            style={{ width: `${Math.min(((dashboard?.raffle_net ?? 0) / (dashboard?.goal ?? 1)) * 100, 100)}%` }}
          />
          <div
            className="progress-segment progress-extra"
            style={{ width: `${Math.min(((dashboard?.extra_raised ?? 0) / (dashboard?.goal ?? 1)) * 100, 100)}%` }}
          />
        </div>
        <div className="progress-legend-admin">
          <span><span className="legend-dot-bar raffle" /> Sorteo (neto)</span>
          <span><span className="legend-dot-bar extra" /> Otros</span>
        </div>
        <p className="progress-text-admin">
          ${(dashboard?.total_raised ?? 0).toLocaleString("es-MX")} de ${(dashboard?.goal ?? 0).toLocaleString("es-MX")} ({progress.toFixed(0)}%)
        </p>
        <p className="transparency-note-admin">
          Venta bruta: ${(dashboard?.raffle_gross ?? 0).toLocaleString("es-MX")} − Premios: ${(dashboard?.prize_costs ?? 0).toLocaleString("es-MX")} = Neto: ${(dashboard?.raffle_net ?? 0).toLocaleString("es-MX")}
        </p>
      </div>

      {/* Quick actions */}
      <div className="quick-actions">
        <Link to="/admin/tickets/new" className="btn-primary">
          Registrar Boleto
        </Link>
        <Link to="/admin/draw" className="btn-accent">
          Ejecutar Sorteo
        </Link>
      </div>

      {/* Grid + Recent tickets side by side */}
      <div className="dashboard-columns">
        {/* Folio grid */}
        {dashboard?.grid && (
          <div className="card">
            <FolioGrid
              grid={dashboard.grid}
              title="Mapa de boletos"
              mode="admin"
              tickets={allTickets as TicketInfo[]}
              onCancel={handleCancel}
              onDownloadPdf={handleDownloadPdf}
              onReassign={(id) => setReassignId(id)}
            />
          </div>
        )}

        {/* Recent tickets */}
        <div className="card">
          <h2 className="page-subheading">Boletos recientes</h2>
        {recentTickets.length === 0 ? (
          <p className="empty-state">No hay boletos registrados aún.</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Folio</th>
                <th>Nombre</th>
                <th>Teléfono</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {recentTickets.map((t) => (
                <tr key={t.id}>
                  <td className="folio-cell">{t.folio}</td>
                  <td>{t.full_name}</td>
                  <td>{t.phone}</td>
                  <td>
                    <span className={`chip chip-${t.status}`}>
                      {t.status === "active" ? "Activo" : "Cancelado"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        </div>
      </div>

      {/* Reassign modal */}
      {reassignId && (
        <div className="modal-overlay" onClick={() => setReassignId(null)}>
          <div className="modal-card card-elevated" onClick={(e) => e.stopPropagation()}>
            <h2 className="page-subheading">Reasignar folio</h2>
            <p className="reassign-folio-label">
              Folio: {allTickets.find((t) => t.id === reassignId)?.folio}
            </p>
            {error && <p className="form-error" style={{ marginBottom: "1rem" }}>{error}</p>}
            <form onSubmit={handleReassign}>
              <div className="form-group">
                <label htmlFor="reassign_name" className="label-meta">Nombre completo</label>
                <input
                  id="reassign_name"
                  className="input-field"
                  type="text"
                  value={reassignName}
                  onChange={(e) => setReassignName(e.target.value)}
                  placeholder="Nuevo comprador"
                  maxLength={200}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="reassign_phone" className="label-meta">Teléfono</label>
                <input
                  id="reassign_phone"
                  className="input-field"
                  type="tel"
                  value={reassignPhone}
                  onChange={(e) => setReassignPhone(e.target.value)}
                  placeholder="+52 123 456 7890"
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="submit" className="btn-primary" disabled={actionLoading === reassignId}>
                  {actionLoading === reassignId ? "Reasignando…" : "Reasignar"}
                </button>
                <button type="button" className="btn-ghost" onClick={() => setReassignId(null)}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
