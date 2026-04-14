import { useEffect, useState, type FormEvent } from "react";
import { api, ApiError } from "../../lib/api";

const API_BASE = import.meta.env.DEV
  ? "/api"
  : "https://d3uu50tlzv08gz.cloudfront.net/api";

interface Ticket {
  id: string;
  folio: string;
  full_name: string;
  phone: string;
  status: string;
  created_at: string;
}

type StatusFilter = "all" | "active" | "pending";
type SortKey = "folio" | "full_name" | "created_at";
type SortDir = "asc" | "desc";

export default function TicketListPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [error, setError] = useState("");

  async function loadTickets() {
    try {
      const data = await api.get<Ticket[]>("/tickets/", true);
      setTickets(data);
    } catch {
      /* empty state */
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTickets();
  }, []);

  // Sort by selected column
  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir(key === "created_at" ? "desc" : "asc");
    }
  }

  const sortIndicator = (key: SortKey) =>
    sortKey === key ? (sortDir === "asc" ? " ▲" : " ▼") : "";

  const sorted = [...tickets].sort((a, b) => {
    let cmp = 0;
    if (sortKey === "folio") {
      cmp = a.folio.localeCompare(b.folio, undefined, { numeric: true });
    } else if (sortKey === "full_name") {
      cmp = a.full_name.localeCompare(b.full_name, "es");
    } else {
      cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  const filtered = sorted.filter((t) => {
    if (filter === "all") return true;
    return t.status === filter;
  });

  async function handleDelete(ticketId: string) {
    if (!window.confirm("¿Seguro que deseas liberar este folio? Al hacerlo, sus datos se borraran y quedara disponible inmediatamente.")) {
      return;
    }
    setError("");
    setActionLoading(ticketId);
    try {
      await api.patch(`/tickets/${ticketId}/cancel`, undefined, true);
      await loadTickets();
    } catch (err) {
      if (err instanceof ApiError) {
        const data = err.data as Record<string, string>;
        setError(data.detail || "Error al liberar boleto.");
      }
    } finally {
      setActionLoading(null);
    }
  }

  async function handleApprove(ticketId: string) {
    setError("");
    setActionLoading(ticketId);
    try {
      await api.patch(`/tickets/${ticketId}/approve`, undefined, true);
      await loadTickets();
    } catch (err) {
      if (err instanceof ApiError) {
        const data = err.data as Record<string, string>;
        setError(data.detail || "Error al aprobar boleto.");
      }
    } finally {
      setActionLoading(null);
    }
  }

  function openEdit(ticket: Ticket) {
    setEditId(ticket.id);
    setEditName(ticket.full_name);
    setEditPhone(ticket.phone);
  }

  async function handleEdit(e: FormEvent) {
    e.preventDefault();
    if (!editId) return;
    setError("");
    setActionLoading(editId);
    try {
      await api.patch(
        `/tickets/${editId}/edit`,
        { full_name: editName, phone: editPhone },
        true
      );
      setEditId(null);
      setEditName("");
      setEditPhone("");
      await loadTickets();
    } catch (err) {
      if (err instanceof ApiError) {
        const data = err.data as Record<string, string | string[]>;
        const msgs = Object.values(data).flat().join(" ");
        setError(msgs || "Error al editar.");
      }
    } finally {
      setActionLoading(null);
    }
  }

  function handleDownloadPdf(ticket: Ticket) {
    const token = localStorage.getItem("hypercore_admin_token");
    fetch(`${API_BASE}/tickets/${ticket.id}/download/pdf`, {
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
        a.download = `ticket-${ticket.folio}.pdf`;
        a.click();
        URL.revokeObjectURL(a.href);
      })
      .catch(() => {
        alert("Error al descargar el PDF. Intenta de nuevo.");
      });
  }

  if (loading) return <p>Cargando…</p>;

  return (
    <div className="admin-ticket-list">
      <h1 className="page-heading">Boletos</h1>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      {/* Filter tabs */}
      <div className="filter-tabs">
        {(["all", "active", "pending"] as StatusFilter[]).map((f) => (
          <button
            key={f}
            className={`filter-tab ${filter === f ? "filter-tab-active" : ""}`}
            onClick={() => setFilter(f)}
            type="button"
          >
            {f === "all" ? "Todos" : f === "active" ? "Activos" : "Pendientes"}
          </button>
        ))}
      </div>



      {/* Edit modal */}
      {editId && (
        <div className="modal-overlay" onClick={() => setEditId(null)}>
          <div className="modal-card card-elevated" onClick={(e) => e.stopPropagation()}>
            <h2 className="page-subheading">Editar boleto</h2>
            <p className="reassign-folio-label">
              Folio: {tickets.find((t) => t.id === editId)?.folio}
            </p>
            <form onSubmit={handleEdit}>
              <div className="form-group">
                <label htmlFor="edit_name" className="label-meta">
                  Nombre completo
                </label>
                <input
                  id="edit_name"
                  className="input-field"
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  maxLength={200}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="edit_phone" className="label-meta">
                  Teléfono
                </label>
                <input
                  id="edit_phone"
                  className="input-field"
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="submit" className="btn-primary" disabled={actionLoading === editId}>
                  {actionLoading === editId ? "Guardando…" : "Guardar"}
                </button>
                <button type="button" className="btn-ghost" onClick={() => setEditId(null)}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ticket table */}
      {filtered.length === 0 ? (
        <p className="empty-state">No hay boletos para mostrar.</p>
      ) : (
        <div className="table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th className="sortable-th" onClick={() => toggleSort("folio")}>
                  Folio{sortIndicator("folio")}
                </th>
                <th className="sortable-th" onClick={() => toggleSort("full_name")}>
                  Nombre{sortIndicator("full_name")}
                </th>
                <th>Teléfono</th>
                <th>Estado</th>
                <th className="sortable-th" onClick={() => toggleSort("created_at")}>
                  Fecha{sortIndicator("created_at")}
                </th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id}>
                  <td className="folio-cell">{t.folio}</td>
                  <td>{t.full_name}</td>
                  <td>{t.phone}</td>
                  <td>
                    <span className={`chip chip-${t.status}`}>
                      {t.status === "active" ? "Activo" : "Pendiente"}
                    </span>
                  </td>
                  <td>{new Date(t.created_at).toLocaleDateString("es-MX")}</td>
                  <td className="actions-cell">
                    <button
                      className="btn-ghost btn-sm"
                      onClick={() => openEdit(t)}
                      type="button"
                    >
                      Editar
                    </button>
                    {t.status === "pending" && (
                      <button
                        className="btn-primary btn-sm"
                        onClick={() => handleApprove(t.id)}
                        disabled={actionLoading === t.id}
                        type="button"
                      >
                        Aprobar Pago
                      </button>
                    )}
                    <button
                      className="btn-ghost btn-sm"
                      onClick={() => handleDelete(t.id)}
                      disabled={actionLoading === t.id}
                      type="button"
                      style={{ color: "var(--error)" }}
                    >
                      Liberar (Eliminar)
                    </button>
                    {t.status === "active" && (
                      <button
                        className="btn-ghost btn-sm"
                        onClick={() => handleDownloadPdf(t)}
                        type="button"
                      >
                        PDF
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
