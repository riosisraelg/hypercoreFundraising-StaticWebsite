import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import "./ResultsPage.css";

interface DrawResultPublic {
  folio: string;
  prize_rank: number;
  prize_name: string;
}

interface DrawResultsResponse {
  results: DrawResultPublic[];
  message?: string;
}

const RANK_EMOJI: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };
const RANK_LABEL: Record<number, string> = {
  1: "1er Lugar",
  2: "2do Lugar",
  3: "3er Lugar",
};

export default function ResultsPage() {
  const [results, setResults] = useState<DrawResultPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawn, setDrawn] = useState(false);

  useEffect(() => {
    api
      .get<DrawResultsResponse>("/draw/results")
      .then((data) => {
        setResults(data.results);
        setDrawn(data.results.length > 0);
      })
      .catch(() => {
        setResults([]);
        setDrawn(false);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="results-page">
      <h1 className="page-heading">Resultados del Sorteo</h1>

      {loading ? (
        <p className="results-loading">Cargando resultados…</p>
      ) : drawn ? (
        <>
          <div className="results-list">
            {results
              .sort((a, b) => a.prize_rank - b.prize_rank)
              .map((r) => (
                <article key={r.folio} className="result-card card-elevated">
                  <span className="result-emoji" role="img" aria-label={RANK_LABEL[r.prize_rank]}>
                    {RANK_EMOJI[r.prize_rank] ?? "🏆"}
                  </span>
                  <span className="result-rank">{RANK_LABEL[r.prize_rank]}</span>
                  <span className="result-folio">{r.folio}</span>
                  <span className="result-prize">{r.prize_name}</span>
                </article>
              ))}
          </div>
          <p className="results-note">
            Si tu folio aparece aquí, ¡felicidades! Contáctanos por WhatsApp
            para reclamar tu premio.
          </p>
        </>
      ) : (
        <div className="results-empty">
          <p className="results-empty-text">
            El sorteo aún no se ha realizado. ¡Mantente atento!
          </p>
        </div>
      )}
    </div>
  );
}
