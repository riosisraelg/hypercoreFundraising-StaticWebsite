import { useEffect, useState } from "react";
import { api, TicketInfo, UserProfile, getToken, clearToken } from "../../lib/api";
import { useNavigate } from "react-router-dom";
import "./UserDashboardPage.css";

interface DashboardData {
  goal: number;
  total_raised: number;
  raffle_net: number;
  extra_raised: number;
}

const WA_NUMBER = "5214421206701";

interface Toast {
  message: string;
  type: 'success' | 'error';
}

export default function UserDashboardPage() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [tickets, setTickets] = useState<TicketInfo[]>([]);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [deletePromptOpen, setDeletePromptOpen] = useState(false);
  const [deletePromptInput, setDeletePromptInput] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [ticketsData, userData, dashData] = await Promise.all([
          api.get<TicketInfo[]>("/tickets/me", true),
          api.get<UserProfile>("/auth/me", true),
          api.get<DashboardData>("/dashboard")
        ]);
        setTickets(ticketsData);
        setUser(userData);
        setDashboard(dashData);
      } catch (e) {
        console.error("Failed to load dashboard data", e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const pendingTickets = tickets.filter(t => t.status === "pending");
  const activeTickets = tickets.filter(t => t.status === "active");

  const handleDownloadPDF = async (ticketId: string, folio: string) => {
    setDownloading(ticketId);
    try {
      const token = getToken();
      const response = await fetch(`${import.meta.env.VITE_API_URL || "/api"}/tickets/${ticketId}/download/pdf`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error("Download failed");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `boleto-${folio}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setToast({ 
        message: "No se pudo generar el PDF. Por favor contacta a soporte si el problema persiste.", 
        type: 'error' 
      });
      setTimeout(() => setToast(null), 6000);
    } finally {
      setDownloading(null);
    }
  };

  const confirmDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullName = `${user?.first_name} ${user?.last_name}`.trim();
    if (deletePromptInput !== fullName) {
      setToast({ message: "El nombre no coincide. Vuelve a intentarlo.", type: 'error' });
      setTimeout(() => setToast(null), 3000);
      return;
    }
    
    setDeleteLoading(true);
    try {
      await api.delete("/auth/me", true);
      clearToken();
      navigate("/");
    } catch (e) {
      setToast({ message: "Error al borrar la cuenta.", type: 'error' });
      setTimeout(() => setToast(null), 3000);
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="public-main" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <p className="label-meta">Cargando tu perfil...</p>
      </div>
    );
  }

  return (
    <div className="public-main">
      {toast && (
        <div className="toast-container">
          <div className={`toast toast--${toast.type}`}>
            {toast.type === 'error' ? '⚠️' : '✅'} {toast.message}
          </div>
        </div>
      )}

      <header style={{ marginBottom: "var(--spacing-12)" }}>
        <h1 className="page-heading" style={{ marginBottom: "var(--spacing-2)" }}>Mi Perfil</h1>
        <p className="label-meta">Giro de Regalos HyperCore — Plataforma de Participante</p>
      </header>

      {dashboard && (
        <div className="dashboard-card card-elevated" style={{ marginBottom: "var(--spacing-8)" }}>
          <h2 className="section-title">Meta de Recaudación ({Math.min((dashboard.total_raised / dashboard.goal) * 100, 100).toFixed(0)}%)</h2>
          <div className="progress-bar-stacked" aria-label="Progreso de recaudación" style={{ height: "1.5rem", borderRadius: "100px", marginBottom: "1rem" }}>
            <div
              className="progress-segment progress-raffle"
              style={{ width: `${Math.min((dashboard.raffle_net / dashboard.goal) * 100, 100)}%` }}
              title={`Sorteo (neto): ${dashboard.raffle_net.toLocaleString("es-MX")}`}
            />
            <div
              className="progress-segment progress-extra"
              style={{ width: `${Math.min((dashboard.extra_raised / dashboard.goal) * 100, 100)}%` }}
              title={`Otros: ${dashboard.extra_raised.toLocaleString("es-MX")}`}
            />
          </div>
          
          <p className="progress-text" style={{ textAlign: "center", fontWeight: "bold" }}>
            Llevamos ${dashboard.total_raised.toLocaleString("es-MX")} de nuestra meta de ${dashboard.goal.toLocaleString("es-MX")}
          </p>
        </div>
      )}

      <div className="dashboard-container">
        {/* Sidebar: Profile Summary */}
        <aside className="profile-summary-card">
          <div className="card-elevated" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-4)' }}>
              <div className="profile-info">
                <h2>{user?.first_name} {user?.last_name}</h2>
                <p>{user?.email}</p>
              </div>
            </div>

            <div className="stats-mini">
              <div className="stat-pill active">
                🎟️ {activeTickets.length} Activos
              </div>
              <div className="stat-pill pending">
                ⏳ {pendingTickets.length} Pendientes
              </div>
            </div>

            <div style={{ marginTop: 'var(--spacing-4)' }}>
              <a href="/results" className="btn-ghost" style={{ width: '100%', justifyContent: 'center', border: '1px solid var(--ghost-border)' }}>
                🏆 Ver Resultados
              </a>
            </div>
          </div>

          <div className="card" style={{ background: 'var(--surface-container-low)', padding: 'var(--spacing-4)' }}>
            <p className="label-meta" style={{ fontSize: '0.65rem', marginBottom: 'var(--spacing-2)' }}>Instrucciones rápidas</p>
            <p style={{ fontSize: '0.8rem', color: 'var(--on-surface-variant)', lineHeight: '1.4' }}>
              Los boletos apartados caducan en 24 horas. Envía tu comprobante vía WhatsApp para validarlos.
            </p>
          </div>
        </aside>

        {/* Main: Tickets List */}
        <main className="dashboard-sections">
          
          {pendingTickets.length > 0 && (
            <section>
              <h3 className="page-subheading" style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', marginBottom: 'var(--spacing-6)' }}>
                <span style={{ color: '#f57f17' }}>●</span> Reservaciones Pendientes
              </h3>
              
              {pendingTickets.length > 1 && (
                <div className="card-elevated" style={{ marginBottom: 'var(--spacing-6)', background: '#fff8e1', border: '1px solid #f57f17', padding: '1.5rem' }}>
                  <h4 style={{ color: '#f57f17', marginBottom: 'var(--spacing-2)', fontSize: '1.1rem' }}>Pago Consolidado Simplificado</h4>
                  <p style={{ fontSize: '0.9rem', color: 'var(--on-surface-variant)', marginBottom: 'var(--spacing-4)' }}>
                    Tienes {pendingTickets.length} folios pendientes. Puedes realizar una sola transferencia por un total de <strong>${(pendingTickets.length * 200).toLocaleString('es-MX')} MXN</strong> y enviarnos un solo comprobante para activarlos todos simultáneamente.
                  </p>
                  <a
                    href={`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(`Hola! Adjunto mi comprobante de pago consolidado para la rifa HyperCore\n\nCantidad de boletos: ${pendingTickets.length}\nFolios: *${pendingTickets.map(t => t.folio).join(', ')}*\nTotal pagado: $${(pendingTickets.length * 200).toLocaleString('es-MX')}\n\nMi nombre: ${user?.first_name} ${user?.last_name}\nMi correo: ${user?.email}\n\n¿Mis datos y folios son correctos?\n\n(Adjunta aquí tu comprobante de transferencia y espera la confirmación de validación)`)}`}
                    className="btn-primary"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ background: '#f57f17', color: '#fff', width: '100%', justifyContent: 'center', fontSize: '1rem', padding: '0.75rem' }}
                  >
                    Enviar Comprobante de Todos 📸
                  </a>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 'var(--spacing-4)' }}>
                {pendingTickets.map(t => (
                  <div key={t.id} className="ticket-card-modern">
                    <div className="ticket-card-header">
                      <span className="ticket-folio-large">{t.folio}</span>
                      <span className="ticket-status-badge" style={{ background: '#fff8e1', color: '#f57f17' }}>Pendiente</span>
                    </div>
                    <div className="ticket-card-content">
                      <p style={{ fontSize: '0.85rem', color: 'var(--on-surface-variant)' }}>
                        Se requiere pago de $200 MXN para participar.
                      </p>
                    </div>
                    <div className="ticket-card-footer">
                      <a
                        href={`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(`Hola! Adjunto mi comprobante de pago para la rifa HyperCore\n\nFolio asignado: *${t.folio}*\nMi nombre: ${user?.first_name} ${user?.last_name}\nMi correo: ${user?.email}\n\n¿Mis datos son correctos?\n\n(Adjunta aquí tu foto/captura del comprobante)`)}`}
                        className="btn-primary"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ width: '100%', background: '#f57f17', color: '#fff', fontSize: '0.75rem' }}
                      >
                        Enviar Comprobante 📸
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section>
            <h3 className="page-subheading" style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', marginBottom: 'var(--spacing-6)' }}>
              <span style={{ color: '#2e7d32' }}>●</span> Boletos Activos
            </h3>
            {activeTickets.length === 0 ? (
              <div className="card" style={{ border: '1px dashed var(--outline-variant)', textAlign: 'center', padding: 'var(--spacing-12)' }}>
                <p className="label-meta">No tienes boletos activos aún.</p>
                <a href="/#boletos" style={{ fontSize: '0.85rem', color: 'var(--primary)', marginTop: 'var(--spacing-2)', display: 'inline-block' }}>Explorar folios disponibles →</a>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 'var(--spacing-4)' }}>
                {activeTickets.map(t => (
                  <div key={t.id} className="ticket-card-modern" style={{ borderLeft: '4px solid #2e7d32' }}>
                    <div className="ticket-card-header">
                      <span className="ticket-folio-large">{t.folio}</span>
                      <span className="ticket-status-badge" style={{ background: '#e8f5e9', color: '#2e7d32' }}>Validado</span>
                    </div>
                    <div className="ticket-card-content">
                      <p style={{ fontSize: '0.85rem', color: 'var(--on-surface-variant)' }}>
                        ¡Ya estás participando en el gran sorteo!
                      </p>
                    </div>
                    <div className="ticket-card-footer">
                      <button
                        className="btn-primary"
                        style={{ width: '100%', background: 'var(--primary)', color: '#fff', fontSize: '0.75rem' }}
                        disabled={downloading === t.id}
                        onClick={() => handleDownloadPDF(t.id, t.folio)}
                      >
                        {downloading === t.id ? "Generando..." : "Descargar PDF 📥"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
          <section style={{ marginTop: "var(--spacing-12)" }}>
            <div className="card" style={{ border: "1px solid var(--error)", background: "#fff5f5" }}>
              <h3 style={{ color: "var(--error)", marginBottom: "var(--spacing-2)" }}>Zona de Peligro</h3>
              <p style={{ fontSize: "0.85rem", color: "var(--on-surface-variant)", marginBottom: "var(--spacing-4)" }}>
                Eliminar tu cuenta borrará todos tus datos permanentemente y liberará tus boletos apartados/activos. Si requieres devolución de dinero, contacta personalmente a soporte antes de proceder.
              </p>
              <button 
                className="btn-primary" 
                style={{ background: "var(--error)", color: "#fff" }}
                onClick={() => setDeletePromptOpen(true)}
              >
                Eliminar mi Cuenta
              </button>
            </div>
          </section>

        </main>
      </div>

      {deletePromptOpen && (
        <div className="modal-overlay" onClick={() => setDeletePromptOpen(false)}>
          <div className="modal-card card-elevated" onClick={e => e.stopPropagation()}>
            <h2 className="page-subheading" style={{ color: "var(--error)" }}>Zona de Peligro</h2>
            <p className="label-meta" style={{ marginBottom: "var(--spacing-4)" }}>
              Esta acción es permanente e irreversible. Escribe tu nombre completo para confirmar: 
              <br/><br/>
              <strong>{user?.first_name} {user?.last_name}</strong>
            </p>
            <form onSubmit={confirmDeleteAccount}>
              <div className="form-group">
                <input 
                  type="text" 
                  className="input-field" 
                  value={deletePromptInput} 
                  onChange={e => setDeletePromptInput(e.target.value)} 
                  placeholder="Tu nombre exacto..." 
                  required 
                />
              </div>
              <div className="modal-actions" style={{ marginTop: "var(--spacing-6)" }}>
                <button type="submit" className="btn-primary" style={{ background: "var(--error)" }} disabled={deleteLoading || deletePromptInput !== `${user?.first_name} ${user?.last_name}`.trim()}>
                  {deleteLoading ? "Eliminando..." : "Confirmar y Eliminar"}
                </button>
                <button type="button" className="btn-ghost" onClick={() => setDeletePromptOpen(false)}>
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
