import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import FolioGrid from "../../components/FolioGrid";
import "./HomePage.css";

interface FolioCell {
  number: number;
  status: "available" | "sold" | "cancelled";
}

interface DashboardData {
  active_tickets: number;
  raffle_raised: number;
  extra_raised: number;
  total_raised: number;
  goal: number;
  raffle_goal: number;
  grid: FolioCell[];
}

export default function HomePage() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<DashboardData>("/dashboard")
      .then(setDashboard)
      .catch(() => setDashboard(null))
      .finally(() => setLoading(false));
  }, []);

  const progressPercent = dashboard
    ? Math.min((dashboard.total_raised / dashboard.goal) * 100, 100)
    : 0;

  return (
    <div className="home-page">
      {/* Hero */}
      <section className="hero-section">
        <span className="hero-badge">Sorteo Benéfico — 25 de Abril, 6:00 PM</span>
        <h1 className="hero-title">
          Apoya a Team HyperCore rumbo a Cancún
        </h1>
        <p className="hero-description">
          Somos un equipo de ingenieros de la Universidad Tecmilenio clasificados
          a la final nacional del KIA Mexico Innovation MeetUp 2026. Compra un
          boleto de $200 MXN y participa por increíbles premios mientras nos
          ayudas a llegar a Cancún.
        </p>
        <a
          href="https://wa.me/5214421206701"
          className="btn-primary hero-cta"
          target="_blank"
          rel="noopener noreferrer"
        >
          Comprar boleto por WhatsApp
        </a>
      </section>

      {/* Prizes */}
      <section className="prizes-section">
        <h2 className="section-title">Premios</h2>
        <div className="prizes-grid">
          <article className="prize-card prize-card--gold">
            <span className="prize-emoji" role="img" aria-label="Primer lugar">🥇</span>
            <span className="prize-rank">1er Lugar</span>
            <span className="prize-name">$5,000 MXN</span>
            <span className="prize-detail">Efectivo</span>
          </article>
          <article className="prize-card prize-card--silver">
            <span className="prize-emoji" role="img" aria-label="Segundo lugar">🥈</span>
            <span className="prize-rank">2do Lugar</span>
            <span className="prize-name">JBL Flip 7</span>
            <span className="prize-detail">Bocina portátil</span>
          </article>
          <article className="prize-card prize-card--bronze">
            <span className="prize-emoji" role="img" aria-label="Tercer lugar">🥉</span>
            <span className="prize-rank">3er Lugar</span>
            <span className="prize-name">Maestro Dobel</span>
            <span className="prize-detail">Botella premium</span>
          </article>
        </div>
      </section>

      {/* Dashboard */}
      <section className="dashboard-section">
        <h2 className="section-title">Progreso de recaudación</h2>
        {loading ? (
          <p className="dashboard-loading">Cargando datos…</p>
        ) : dashboard ? (
          <div className="dashboard-card card-elevated">
            <div className="dashboard-stats">
              <div className="stat-block">
                <span className="stat-value">{dashboard.active_tickets}</span>
                <span className="stat-label">Boletos vendidos</span>
              </div>
              <div className="stat-block">
                <span className="stat-value">
                  ${dashboard.raffle_raised.toLocaleString("es-MX")}
                </span>
                <span className="stat-label">Sorteo</span>
              </div>
              <div className="stat-block">
                <span className="stat-value">
                  ${dashboard.extra_raised.toLocaleString("es-MX")}
                </span>
                <span className="stat-label">Otros ingresos</span>
              </div>
              <div className="stat-block">
                <span className="stat-value">
                  ${dashboard.goal.toLocaleString("es-MX")}
                </span>
                <span className="stat-label">Meta total</span>
              </div>
            </div>
            <div className="progress-bar-stacked" aria-label="Progreso de recaudación">
              <div
                className="progress-segment progress-raffle"
                style={{ width: `${Math.min((dashboard.raffle_raised / dashboard.goal) * 100, 100)}%` }}
                title={`Sorteo: $${dashboard.raffle_raised.toLocaleString("es-MX")}`}
              />
              <div
                className="progress-segment progress-extra"
                style={{ width: `${Math.min((dashboard.extra_raised / dashboard.goal) * 100, 100)}%` }}
                title={`Otros: $${dashboard.extra_raised.toLocaleString("es-MX")}`}
              />
            </div>
            <div className="progress-legend">
              <span className="legend-item"><span className="legend-dot-bar raffle" /> Sorteo</span>
              <span className="legend-item"><span className="legend-dot-bar extra" /> Otros ingresos</span>
            </div>
            <p className="progress-text">
              ${dashboard.total_raised.toLocaleString("es-MX")} de ${dashboard.goal.toLocaleString("es-MX")} ({progressPercent.toFixed(0)}%)
            </p>
          </div>
        ) : (
          <p className="dashboard-error">No se pudieron cargar los datos.</p>
        )}
        {dashboard?.grid && (
          <FolioGrid grid={dashboard.grid} title="¡Escoge tu boleto!" />
        )}
      </section>

      {/* How to participate */}
      <section className="participate-section">
        <h2 className="section-title">¿Cómo participar?</h2>
        <ol className="steps-list">
          <li className="step-item">
            <span className="step-number">1</span>
            <div>
              <span className="step-title">Contáctanos</span>
              <span className="step-desc">
                Escríbenos por WhatsApp para apartar tu boleto.
              </span>
            </div>
          </li>
          <li className="step-item">
            <span className="step-number">2</span>
            <div>
              <span className="step-title">Realiza tu pago</span>
              <span className="step-desc">
                Cada boleto cuesta $200 MXN. Aceptamos efectivo y transferencia.
              </span>
            </div>
          </li>
          <li className="step-item">
            <span className="step-number">3</span>
            <div>
              <span className="step-title">Recibe tu boleto digital</span>
              <span className="step-desc">
                Te enviaremos tu boleto con folio único en PDF o pase de wallet.
              </span>
            </div>
          </li>
          <li className="step-item">
            <span className="step-number">4</span>
            <div>
              <span className="step-title">Espera el sorteo</span>
              <span className="step-desc">
                Los resultados se publicarán en esta página. ¡Buena suerte!
              </span>
            </div>
          </li>
        </ol>
      </section>

      {/* Contact */}
      <section className="contact-section">
        <h2 className="section-title">Contacto</h2>
        <div className="contact-links">
          <a
            href="https://wa.me/5214421206701"
            className="btn-primary"
            target="_blank"
            rel="noopener noreferrer"
          >
            WhatsApp
          </a>
          <a
            href="https://www.instagram.com/hyper.coree"
            className="btn-ghost"
            target="_blank"
            rel="noopener noreferrer"
          >
            Instagram
          </a>
        </div>
      </section>
    </div>
  );
}
