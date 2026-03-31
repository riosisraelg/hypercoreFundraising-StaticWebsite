import { useEffect, useState } from "react";
import { api, ApiError } from "../../lib/api";

interface DrawResult {
  id: string;
  folio: string;
  full_name: string;
  phone: string;
  prize_rank: number;
  prize_name: string;
  drawn_at: string;
}

interface PublicResult {
  folio: string;
  prize_rank: number;
  prize_name: string;
}

interface PublicResultsResponse {
  results: PublicResult[];
  message?: string;
}

interface ConfirmationInfo {
  active_tickets: number;
  cancelled_tickets: number;
  unsold_tickets: number;
  total_folios: number;
}

const PRIZE_EMOJI: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

export default function DrawPage() {
  const [adminResults, setAdminResults] = useState<DrawResult[]>([]);
  const [publicResults, setPublicResults] = useState<PublicResult[]>([]);
  const [drawExists, setDrawExists] = useState(false);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [showRerun, setShowRerun] = useState(false);
  const [error, setError] = useState("");
  const [blocked, setBlocked] = useState(false);
  const [blockMessage, setBlockMessage] = useState("");
  const [confirmInfo, setConfirmInfo] = useState<ConfirmationInfo | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  useEffect(() => {
    async function checkExisting() {
      try {
        const data = await api.get<PublicResultsResponse>("/draw/results");
        if (data.results && data.results.length > 0) {
          setDrawExists(true);
          setPublicResults(data.results.sort((a, b) => a.prize_rank - b.prize_rank));
        }
      } catch { /* no results */ }
      finally { setLoading(false); }
    }
    checkExisting();
  }, []);

  async function executeDraw(conf?: string) {
    setError("");
    setExecuting(true);
    setBlocked(false);
    setShowConfirmDialog(false);
    try {
      const body: Record<string, string> = {};
      if (conf) body.confirmation = conf;
      const results = await api.post<DrawResult[]>("/draw/execute", body, true);
      setAdminResults(results.sort((a, b) => a.prize_rank - b.prize_rank));
      setDrawExists(true);
      setShowRerun(false);
      setConfirmation("");
      setConfirmInfo(null);
    } catch (err) {
      if (err instanceof ApiError) {
        const data = err.data as Record<string, any>;
        if (err.status === 403 && data.blocked) {
          setBlocked(true);
          setBlockMessage(data.detail);
        } else if (err.status === 428 && data.requires_confirmation) {
          setConfirmInfo({
            active_tickets: data.active_tickets,
            cancelled_tickets: data.cancelled_tickets,
            unsold_tickets: data.unsold_tickets,
            total_folios: data.total_folios,
          });
          setShowConfirmDialog(true);
        } else if (err.status === 409) {
          setDrawExists(true);
          setError("El sorteo ya fue ejecutado. Usa la opción de re-ejecutar.");
        } else {
          setError(data.detail || "Error al ejecutar el sorteo.");
        }
      } else {
        setError("Error de conexión.");
      }
    } finally {
      setExecuting(false);
    }
  }

  function handleConfirmDraw() {
    executeDraw("confirmar sorteo");
  }

  function handleRerun() {
    if (confirmation === "rewrite draw") {
      executeDraw("rewrite draw");
    } else {
      setError('Escribe exactamente "rewrite draw" para confirmar.');
    }
  }

  if (loading) return <p>Cargando…</p>;

  const displayResults = adminResults.length > 0 ? adminResults : null;

  return (
    <div className="admin-draw">
      <h1 className="page-heading">Sorteo</h1>

      {error && <p className="form-error" role="alert">{error}</p>}

      {/* Date blocked */}
      {blocked && (
        <div className="card-elevated draw-blocked">
          <span style={{ fontSize: "2rem" }}>🔒</span>
          <p>{blockMessage}</p>
        </div>
      )}

      {/* Confirmation dialog with ticket stats */}
      {showConfirmDialog && confirmInfo && (
        <div className="card-elevated draw-confirm-dialog">
          <h2 className="page-subheading">⚠️ Confirmar ejecución del sorteo</h2>
          <div className="confirm-stats">
            <div className="confirm-stat">
              <span className="stat-value">{confirmInfo.active_tickets}</span>
              <span className="label-meta">Boletos activos</span>
            </div>
            <div className="confirm-stat">
              <span className="stat-value">{confirmInfo.cancelled_tickets}</span>
              <span className="label-meta">Cancelados</span>
            </div>
            <div className="confirm-stat">
              <span className="stat-value" style={{ color: "var(--error, #ba1a1a)" }}>
                {confirmInfo.unsold_tickets}
              </span>
              <span className="label-meta">Sin vender</span>
            </div>
            <div className="confirm-stat">
              <span className="stat-value">{confirmInfo.total_folios}</span>
              <span className="label-meta">Total</span>
            </div>
          </div>
          <p className="confirm-warning">
            {confirmInfo.unsold_tickets > 0
              ? `Hay ${confirmInfo.unsold_tickets} boletos sin vender. ¿Estás seguro de ejecutar el sorteo ahora?`
              : "Todos los boletos están vendidos. ¿Ejecutar el sorteo?"}
          </p>
          <div className="confirm-actions">
            <button className="btn-primary" onClick={handleConfirmDraw} disabled={executing} type="button">
              {executing ? "Ejecutando…" : "Sí, ejecutar sorteo"}
            </button>
            <button className="btn-ghost" onClick={() => setShowConfirmDialog(false)} type="button">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* No draw yet, no dialog */}
      {!drawExists && !displayResults && !showConfirmDialog && !blocked && (
        <div className="card-elevated draw-action-card">
          <p>El sorteo aún no se ha ejecutado. Se seleccionarán 3 ganadores al azar de los boletos activos.</p>
          <button className="btn-primary draw-btn" onClick={() => executeDraw()} disabled={executing} type="button">
            {executing ? "Verificando…" : "Ejecutar Sorteo"}
          </button>
        </div>
      )}

      {/* Draw exists — show results + rerun */}
      {drawExists && !displayResults && (
        <div className="card-elevated">
          <h2 className="page-subheading">Resultados actuales</h2>
          <div className="draw-results-list">
            {publicResults.map((r) => (
              <div key={r.prize_rank} className="draw-result-row">
                <span className="prize-emoji">{PRIZE_EMOJI[r.prize_rank]}</span>
                <span className="folio-cell">{r.folio}</span>
                <span className="prize-name">{r.prize_name}</span>
              </div>
            ))}
          </div>
          {!showRerun ? (
            <button className="btn-ghost" onClick={() => setShowRerun(true)} type="button">Re-ejecutar sorteo</button>
          ) : (
            <div className="rerun-section">
              <p className="rerun-warning">Esto eliminará los resultados actuales. Escribe <code>rewrite draw</code> para confirmar.</p>
              <div className="rerun-input-row">
                <input className="input-field" type="text" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} placeholder='Escribe "rewrite draw"' />
                <button className="btn-primary" onClick={handleRerun} disabled={executing} type="button">{executing ? "Ejecutando…" : "Confirmar"}</button>
                <button className="btn-ghost" onClick={() => { setShowRerun(false); setConfirmation(""); }} type="button">Cancelar</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Admin results after executing */}
      {displayResults && (
        <div className="card-elevated">
          <h2 className="page-subheading">🎉 Ganadores</h2>
          <div className="winners-grid">
            {displayResults.map((r) => (
              <div key={r.prize_rank} className="winner-card card">
                <span className="prize-emoji-lg">{PRIZE_EMOJI[r.prize_rank]}</span>
                <span className="label-meta">{r.prize_rank === 1 ? "1er Lugar" : r.prize_rank === 2 ? "2do Lugar" : "3er Lugar"}</span>
                <span className="winner-folio">{r.folio}</span>
                <span className="winner-name">{r.full_name}</span>
                <span className="winner-phone">{r.phone}</span>
                <span className="winner-prize">{r.prize_name}</span>
              </div>
            ))}
          </div>
          {!showRerun ? (
            <button className="btn-ghost" onClick={() => setShowRerun(true)} type="button" style={{ marginTop: "var(--spacing-6)" }}>Re-ejecutar sorteo</button>
          ) : (
            <div className="rerun-section">
              <p className="rerun-warning">Esto eliminará los resultados actuales. Escribe <code>rewrite draw</code> para confirmar.</p>
              <div className="rerun-input-row">
                <input className="input-field" type="text" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} placeholder='Escribe "rewrite draw"' />
                <button className="btn-primary" onClick={handleRerun} disabled={executing} type="button">{executing ? "Ejecutando…" : "Confirmar"}</button>
                <button className="btn-ghost" onClick={() => { setShowRerun(false); setConfirmation(""); }} type="button">Cancelar</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
