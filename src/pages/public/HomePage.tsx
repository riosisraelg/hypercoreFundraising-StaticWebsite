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
        <span className="hero-badge">🎟️ Rifa Benéfica — 25 de Abril, 6:00 PM</span>
        <h1 className="hero-title">¡Compra tu boleto y gana premios!</h1>
        <p className="hero-description">
          Rifa benéfica de Team HyperCore (Universidad Tecmilenio).
          Solo 200 boletos a $200 MXN cada uno. Escoge tu número,
          paga por transferencia o efectivo, y participa por 3 premios.
          El sorteo se realiza el 25 de abril a las 6:00 PM en vivo.
          Todos los fondos van para nuestra participación en la final
          nacional del KIA Mexico Innovation MeetUp 2026 en Cancún.
        </p>
        <a
          href={`https://wa.me/5214421206701?text=${encodeURIComponent("Hola! 👋 Me interesa comprar boleto(s) para la rifa HyperCore 🎟️\n\nCantidad de boletos: \nFolios que quiero (o aleatorio): \nNombre completo: \nTeléfono de contacto: ")}`}
          className="btn-primary hero-cta"
          target="_blank"
          rel="noopener noreferrer"
        >
          🎟️ Comprar boleto por WhatsApp
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

      {/* How to participate + Payment Info — side by side */}
      <section className="participate-payment-section">
        <div className="participate-payment-grid">
          <div className="participate-block">
            <h2 className="section-title">¿Cómo participar?</h2>
            <ol className="steps-list">
              <li className="step-item">
                <span className="step-number">1</span>
                <div>
                  <span className="step-title">Escoge tu número</span>
                  <span className="step-desc">
                    Revisa la tabla de boletos abajo y elige los números disponibles.
                  </span>
                </div>
              </li>
              <li className="step-item">
                <span className="step-number">2</span>
                <div>
                  <span className="step-title">Escríbenos por WhatsApp</span>
                  <span className="step-desc">
                    Mándanos tu nombre, teléfono y los números que quieres.
                  </span>
                </div>
              </li>
              <li className="step-item">
                <span className="step-number">3</span>
                <div>
                  <span className="step-title">Paga $200 MXN por boleto</span>
                  <span className="step-desc">
                    Transferencia bancaria o efectivo. Envía tu comprobante por WhatsApp.
                  </span>
                </div>
              </li>
              <li className="step-item">
                <span className="step-number">4</span>
                <div>
                  <span className="step-title">Recibe tu boleto digital</span>
                  <span className="step-desc">
                    Te enviamos un PDF con tu folio único.
                  </span>
                </div>
              </li>
              <li className="step-item">
                <span className="step-number">5</span>
                <div>
                  <span className="step-title">Sorteo el 25 de Abril, 6 PM</span>
                  <span className="step-desc">
                    3 ganadores al azar. Resultados aquí y por WhatsApp.
                  </span>
                </div>
              </li>
            </ol>
          </div>

          <div className="payment-info-card card-elevated">
            <h2 className="section-title">Datos de pago</h2>
            <p className="payment-thanks">
              ¡Gracias por apoyarnos a llegar a la final!
            </p>
            <div className="payment-details">
              <div className="payment-row">
                <span className="payment-label">Beneficiaria</span>
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
            <p className="payment-note">
              ¡No olvides enviar tu comprobante por WhatsApp!
            </p>
            <a
              href={`https://wa.me/5214421206701?text=${encodeURIComponent("Hola! 👋 Adjunto mi comprobante de pago para la rifa HyperCore 🎟️\n\nCantidad de boletos pagados: \nFolios que quiero (o aleatorio): \nNombre completo: \nTeléfono de contacto: \n\n¿La información es correcta?\n\n📎 (Adjunta aquí tu foto/captura del comprobante)")}`}
              className="btn-primary payment-cta"
              target="_blank"
              rel="noopener noreferrer"
            >
              Enviar comprobante
            </a>
          </div>
        </div>
      </section>

      {/* Folio Grid + Dashboard */}
      <section className="dashboard-section">
        {dashboard?.grid && (
          <FolioGrid grid={dashboard.grid} title="¡Escoge tu boleto!" />
        )}
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
                  ${dashboard.raffle_net.toLocaleString("es-MX")}
                </span>
                <span className="stat-label">Neto sorteo</span>
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
                style={{ width: `${Math.min((dashboard.raffle_net / dashboard.goal) * 100, 100)}%` }}
                title={`Sorteo (neto): ${dashboard.raffle_net.toLocaleString("es-MX")}`}
              />
              <div
                className="progress-segment progress-extra"
                style={{ width: `${Math.min((dashboard.extra_raised / dashboard.goal) * 100, 100)}%` }}
                title={`Otros: ${dashboard.extra_raised.toLocaleString("es-MX")}`}
              />
            </div>
            <div className="progress-legend">
              <span className="legend-item"><span className="legend-dot-bar raffle" /> Sorteo (neto de premios)</span>
              <span className="legend-item"><span className="legend-dot-bar extra" /> Otros ingresos</span>
            </div>
            <p className="progress-text">
              ${dashboard.total_raised.toLocaleString("es-MX")} de ${dashboard.goal.toLocaleString("es-MX")} ({progressPercent.toFixed(0)}%)
            </p>
            <p className="transparency-note">
              Venta bruta: ${dashboard.raffle_gross.toLocaleString("es-MX")} − Premios: ${dashboard.prize_costs.toLocaleString("es-MX")} = Neto: ${dashboard.raffle_net.toLocaleString("es-MX")}
            </p>
          </div>
        ) : (
          <p className="dashboard-error">No se pudieron cargar los datos.</p>
        )}
      </section>

      {/* Contact */}
      <section className="contact-section">
        <h2 className="section-title">Contacto</h2>
        <div className="contact-links">
          <a
            href={`https://wa.me/5214421206701?text=${encodeURIComponent("Hola! 👋 Tengo una pregunta sobre la rifa HyperCore 🎟️\n\n")}`}
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
