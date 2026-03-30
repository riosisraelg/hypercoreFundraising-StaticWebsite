import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import FolioGrid from "../../components/FolioGrid";

interface FolioCell {
  number: number;
  status: "available" | "sold" | "cancelled";
}

interface DashboardData {
  active_tickets: number;
  total_raised: number;
  goal: number;
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

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [recentTickets, setRecentTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [dash, tickets] = await Promise.all([
          api.get<DashboardData>("/dashboard"),
          api.get<Ticket[]>("/tickets/", true),
        ]);
        setDashboard(dash);
        setRecentTickets(tickets.slice(0, 10));
      } catch {
        /* handled by empty state */
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <p>Cargando…</p>;

  const progress = dashboard
    ? Math.min((dashboard.total_raised / dashboard.goal) * 100, 100)
    : 0;

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
          <span className="label-meta">Recaudado</span>
          <span className="stat-value">
            ${(dashboard?.total_raised ?? 0).toLocaleString("es-MX")} MXN
          </span>
        </div>
        <div className="card-elevated stat-card">
          <span className="label-meta">Meta</span>
          <span className="stat-value">
            ${(dashboard?.goal ?? 0).toLocaleString("es-MX")} MXN
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="card progress-section">
        <div className="progress-header">
          <span className="label-meta">Progreso de recaudación</span>
          <span className="label-meta">{progress.toFixed(1)}%</span>
        </div>
        <div className="progress-bar-track">
          <div
            className="progress-bar-fill"
            style={{ width: `${progress}%` }}
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
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

      {/* Folio grid */}
      {dashboard?.grid && (
        <div className="card">
          <FolioGrid grid={dashboard.grid} title="Mapa de boletos" />
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
  );
}
