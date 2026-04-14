import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import FolioGrid from "../../components/FolioGrid";
import "./HomePage.css";

interface FolioCell {
  number: number;
  status: "available" | "sold" | "cancelled";
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
        <span className="hero-badge">🎟️ Gran Sorteo Benéfico — Rumbo a Cancún 2026</span>
        <h1 className="hero-title">Ayúdanos a llegar a la gran Final Nacional</h1>
        <p className="hero-description">
          Somos 4 estudiantes de ingeniería de la Universidad Tecmilenio participando en el Innovation Meetup 2026. 
          Tras mucho esfuerzo superamos la primera etapa como semifinalistas, y ahora vamos con todo rumbo a la final en Cancún. 
          Estamos profundamente comprometidos y entusiasmados en dar nuestro máximo esfuerzo en la competencia. 
          Tu apoyo significa el mundo para nosotros: comprando un boleto de $200 MXN nos ayudas a financiar los viáticos de nuestro viaje 
          y, como agradecimiento, estarás participando para ganar cualquiera de nuestros increíbles premios. ¡Únete a nuestro sueño!
        </p>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center', marginBottom: 'var(--spacing-8)' }}>
          <a href="#boletos" className="btn-primary hero-cta">
            🎟️ Seleccionar mi Boleto
          </a>
          <Link to="/about" className="btn-ghost hero-cta" style={{ border: "2px solid var(--primary)", color: "var(--primary)" }}>
            Conocer al Equipo
          </Link>
        </div>

        {/* Progress Bar inside Hero */}
        <div style={{ maxWidth: '600px', margin: '0 auto', background: 'var(--surface-container-lowest)', padding: 'var(--spacing-4)', borderRadius: 'var(--rounded-lg)', boxShadow: 'var(--shadow-ambient)', border: '1px solid var(--ghost-border)' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: 'var(--spacing-3)', color: 'var(--on-surface)' }}>
            Meta de Recaudación ({progressPercent.toFixed(0)}%)
          </h2>
          {loading ? (
            <p className="dashboard-loading">Cargando datos…</p>
          ) : dashboard ? (
            <div>
              <div className="progress-bar-stacked" aria-label="Progreso de recaudación" style={{ height: "1.25rem", borderRadius: "100px", marginBottom: "0.75rem" }}>
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
              <p className="progress-text" style={{ textAlign: "center", fontWeight: "bold", fontSize: '0.9rem', color: 'var(--primary)' }}>
                Llevamos ${dashboard.total_raised.toLocaleString("es-MX")} / ${dashboard.goal.toLocaleString("es-MX")}
              </p>
            </div>
          ) : (
            <p className="dashboard-error">No se pudieron cargar los datos.</p>
          )}
        </div>
      </section>

      {/* Timeline Journey (Moved up to tell the story first) */}
      <section className="timeline-section" style={{ background: "var(--surface-container-low)" }}>
        <div className="timeline-container">
          <div className="timeline-item">
            <div className="timeline-marker"></div>
            <div className="timeline-content">
              <span className="timeline-date">Abril 2026</span>
              <h3 className="timeline-title">Recaudación y Gran Sorteo</h3>
              <p className="timeline-desc">
                Organizamos esta rifa para cubrir viáticos de nuestro equipo rumbo a Cancún. ¡Cada boleto es crucial!
              </p>
            </div>
          </div>
          <div className="timeline-item active">
            <div className="timeline-marker"></div>
            <div className="timeline-content">
              <span className="timeline-date">25 Abril, 6 PM</span>
              <h3 className="timeline-title">Sorteo en Vivo</h3>
              <p className="timeline-desc">
                Transmitiremos el sorteo de los 3 ganadores. Además, los resultados se publicarán aquí en la plataforma.
              </p>
            </div>
          </div>
          <div className="timeline-item">
            <div className="timeline-marker"></div>
            <div className="timeline-content">
              <span className="timeline-date">Mayo 2026</span>
              <h3 className="timeline-title">Final Nacional KIA Mexico</h3>
              <p className="timeline-desc">
                Representaremos a Querétaro con nuestro proyecto de digitalización de pintura automotriz de la Industria 4.0.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Prizes */}
      <section className="prizes-section">
        <h2 className="section-title">Premios del Sorteo</h2>
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

      {/* How to participate */}
      <section className="participate-payment-section" id="how-it-works">
        <div className="participate-payment-grid">
          <div className="participate-block">
            <h2 className="section-title">¿Cómo participar?</h2>
            <ol className="steps-list">
              <li className="step-item">
                <span className="step-number">1</span>
                <div>
                  <span className="step-title">Elige tu Folio</span>
                  <span className="step-desc">
                    Baja a nuestra cuadrícula y haz clic en el número que desees apartar.
                  </span>
                </div>
              </li>
              <li className="step-item">
                <span className="step-number">2</span>
                <div>
                  <span className="step-title">Crea tu Cuenta / Reserva</span>
                  <span className="step-desc">
                    El sistema te pedirá iniciar sesión para guardar el boleto a tu nombre. Tu boleto quedará "Reservado" por 24 hrs. Recibirás una notificación por correo al apartarlo.
                  </span>
                </div>
              </li>
              <li className="step-item">
                <span className="step-number">3</span>
                <div>
                  <span className="step-title">Envía tu Comprobante de Pago</span>
                  <span className="step-desc">
                    Paga $200 MXN. Desde tu Perfil, usa el botón "Enviar Comprobante" para enviarnos tu captura rápidamente por WhatsApp.
                  </span>
                </div>
              </li>
              <li className="step-item">
                <span className="step-number">4</span>
                <div>
                  <span className="step-title">Descarga tu PDF Oficial</span>
                  <span className="step-desc">
                    En cuanto validemos tu pago, te llegará otro correo y podrás descargar tu pase desde tu Perfil.
                  </span>
                </div>
              </li>
            </ol>
          </div>

          <div className="payment-info-card card-elevated">
            <h2 className="section-title">Datos Bancarios</h2>
            <p className="payment-thanks">Cuentas con 24 horas tras reservar para realizar tu pago.</p>
            <div className="payment-details">
              <div className="payment-row">
                <span className="payment-label">Titular</span>
                <span className="payment-value">Mariana Lopez Garcia</span>
              </div>
              <div className="payment-row payment-row--highlight">
                <span className="payment-value payment-bank">BBVA</span>
              </div>
              <div className="payment-row">
                <span className="payment-label">No. Cuenta</span>
                <span className="payment-value">1596786461</span>
              </div>
              <div className="payment-row">
                <span className="payment-label">CLABE</span>
                <span className="payment-value">012180015967864619</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Folio Grid + Dashboard */}
      <section className="dashboard-section" id="boletos">
        {dashboard?.grid && (
          <FolioGrid grid={dashboard.grid} title="¡Haz clic en un boleto para reservarlo!" />
        )}
      </section>
    </div>
  );
}
