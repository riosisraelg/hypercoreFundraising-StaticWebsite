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

  useEffect(() => {
    async function checkExisting() {
      try {
        const data = await api.get<PublicResultsResponse>("/draw/results");
        if (data.results && data.results.length > 0) {
          setDrawExists(true);
          setPublicResults(data.results.sort((a, b) => a.prize_rank - b.prize_rank));
        }
      } catch {
        /* no results */
      } finally {
        setLoading(false);
      }
    }
    checkExisting();
  }, []);

  async function executeDraw(conf?: string) {
    setError("");
    setExecuting(true);
    try {
      const body: Record<string, string> = {};
      if (conf) body.confirmation = conf;
      const results = await api.post<DrawResult[]>("/draw/execute", body, true);
      setAdminResults(results.sort((a, b) => a.prize_rank - b.prize_rank));
      setDrawExists(true);
      setShowRerun(false);
      setConfirmation("");
    } catch (err) {
      if (err instanceof ApiError) {
        const data = err.data as Record<string, string>;
        if (err.status === 409) {
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

  function handleRerun() {
    if (confirmation === "rewrite draw") {
      executeDraw("rewrite draw");
    } else {
      setError('Escribe exactamente "rewrite draw" para confirmar.');
    }
  }

  if (loading) return <p>Cargando…</p>;

  // Show admin results if we have them (after executing)
  const displayResults = adminResults.length > 0 ? adminResults : null;

  return (
    <div className="admin-draw">
      <h1 className="page-heading">Sorteo</h1>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      {/* No draw executed yet */}
      {!drawExists && !displayResults && (
        <div className="card-elevated draw-action-card">
          <p>El sorteo aún no se ha ejecutado. Se seleccionarán 3 ganadores al azar de los boletos activos.</p>
          <button
            className="btn-primary draw-btn"
            onClick={() => executeDraw()}
            disabled={executing}
            type="button"
          >
            {executing ? "Ejecutando…" : "Ejecutar Sorteo"}
          </button>
        </div>
      )}

      {/* Draw already exists — show public results + rerun option */}
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
            <button
              className="btn-ghost"
              onClick={() => setShowRerun(true)}
              type="button"
            >
              Re-ejecutar sorteo
            </button>
          ) : (
            <div className="rerun-section">
              <p className="rerun-warning">
                Esto eliminará los resultados actuales. Escribe <code>rewrite draw</code> para confirmar.
              </p>
              <div className="rerun-input-row">
                <input
                  className="input-field"
                  type="text"
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                  placeholder='Escribe "rewrite draw"'
                />
                <button
                  className="btn-primary"
                  onClick={handleRerun}
                  disabled={executing}
                  type="button"
                >
                  {executing ? "Ejecutando…" : "Confirmar"}
                </button>
                <button
                  className="btn-ghost"
                  onClick={() => {
                    setShowRerun(false);
                    setConfirmation("");
                  }}
                  type="button"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Admin results with full details (after executing) */}
      {displayResults && (
        <div className="card-elevated">
          <h2 className="page-subheading">Ganadores</h2>
          <div className="winners-grid">
            {displayResults.map((r) => (
              <div key={r.prize_rank} className="winner-card card">
                <span className="prize-emoji-lg">{PRIZE_EMOJI[r.prize_rank]}</span>
                <span className="label-meta">
                  {r.prize_rank === 1 ? "1er Lugar" : r.prize_rank === 2 ? "2do Lugar" : "3er Lugar"}
                </span>
                <span className="winner-folio">{r.folio}</span>
                <span className="winner-name">{r.full_name}</span>
                <span className="winner-phone">{r.phone}</span>
                <span className="winner-prize">{r.prize_name}</span>
              </div>
            ))}
          </div>

          {/* Rerun option */}
          {!showRerun ? (
            <button
              className="btn-ghost"
              onClick={() => setShowRerun(true)}
              type="button"
              style={{ marginTop: "var(--spacing-6)" }}
            >
              Re-ejecutar sorteo
            </button>
          ) : (
            <div className="rerun-section">
              <p className="rerun-warning">
                Esto eliminará los resultados actuales. Escribe <code>rewrite draw</code> para confirmar.
              </p>
              <div className="rerun-input-row">
                <input
                  className="input-field"
                  type="text"
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                  placeholder='Escribe "rewrite draw"'
                />
                <button
                  className="btn-primary"
                  onClick={handleRerun}
                  disabled={executing}
                  type="button"
                >
                  {executing ? "Ejecutando…" : "Confirmar"}
                </button>
                <button
                  className="btn-ghost"
                  onClick={() => {
                    setShowRerun(false);
                    setConfirmation("");
                  }}
                  type="button"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
