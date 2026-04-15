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
      {/* Hero */}
      <section className="hero-section">
        <div className="hero-content">
          <span className="hero-badge">🎟️ Rifa Benéfica — 25 de Abril, 6:00 PM</span>
          <h1 className="hero-title">¡Compra tu boleto y gana premios!</h1>
          <p className="hero-description">
            Rifa benéfica de Team HyperCore (Universidad Tecmilenio).
            Participa por 3 premios premium y ayúdanos a llegar a la final nacional de KIA Innovation en Cancún.
          </p>
          
          <div className="hero-cta-group">
            <a
              href={`https://wa.me/5214421206701?text=${encodeURIComponent("Hola! Me interesa comprar boleto(s) para la rifa HyperCore\n\nCantidad de boletos: \nFolios que quiero (o aleatorio): \nNombre completo: \nTeléfono de contacto: ")}`}
              className="btn-primary hero-cta"
              target="_blank"
              rel="noopener noreferrer"
            >
              🎟️ Comprar Boleto vía WhatsApp
            </a>
          </div>

          {/* Integrated Mini-Dashboard in Hero */}
          {!loading && dashboard && (
            <div className="hero-dashboard animate-fade-in">
              <div className="hero-progress-container">
                <div className="hero-progress-info">
                  <span className="hero-progress-label">Progreso de recaudación</span>
                  <span className="hero-progress-value">
                    ${dashboard.total_raised.toLocaleString("es-MX")} / ${dashboard.goal.toLocaleString("es-MX")} ({progressPercent.toFixed(0)}%)
                  </span>
                </div>
                <div className="hero-progress-bar-bg">
                  <div 
                    className="hero-progress-bar-fill" 
                    style={{ width: `${progressPercent}%` }}
                  >
                    <div className="hero-progress-glow" />
                  </div>
                </div>
              </div>
              
              <div className="hero-stats-grid">
                <div className="hero-stat-item">
                  <span className="hero-stat-val">{dashboard.active_tickets}</span>
                  <span className="hero-stat-lab">Boletos</span>
                </div>
                <div className="hero-stat-divider" />
                <div className="hero-stat-item">
                  <span className="hero-stat-val">
                    ${dashboard.raffle_net.toLocaleString("es-MX")}
                  </span>
                  <span className="hero-stat-lab">Neto Sorteo</span>
                </div>
                <div className="hero-stat-divider" />
                <div className="hero-stat-item">
                  <span className="hero-stat-val">
                    ${dashboard.extra_raised.toLocaleString("es-MX")}
                  </span>
                  <span className="hero-stat-lab">Donaciones</span>
                </div>
              </div>
            </div>
          )}
        </div>
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

      {/* How to participate + Payment Info — Side by side Premium Container */}
      <section className="participate-payment-section">
        <div className="section-container-unified card-premium">
          <div className="participate-payment-grid">
            <div className="participate-block">
              <div className="participate-header">
                <span className="participate-badge">Guía Rápida</span>
                <h2 className="section-title">¿Cómo participar?</h2>
              </div>
              <ol className="steps-list-modern">
                <li className="step-item-modern">
                  <div className="step-icon">1</div>
                  <div className="step-info">
                    <h3 className="step-title-text">Escoge tu número</h3>
                    <p className="step-desc-text">Revisa la disponibilidad en la tabla de abajo y selecciona tus favoritos.</p>
                  </div>
                </li>
                <li className="step-item-modern">
                  <div className="step-icon">2</div>
                  <div className="step-info">
                    <h3 className="step-title-text">Escríbenos por WhatsApp</h3>
                    <p className="step-desc-text">Mándanos tu nombre y los folios que elegiste para reservarlos.</p>
                  </div>
                </li>
                <li className="step-item-modern active-step">
                  <div className="step-icon">3</div>
                  <div className="step-info">
                    <h3 className="step-title-text">Realiza tu pago</h3>
                    <p className="step-desc-text">Usa los datos de la tarjeta <span className="hide-on-mobile">a la derecha</span><span className="show-on-mobile">abajo</span> para transferencia o efectivo.</p>
                  </div>
                  <div className="step-pointer">
                    <svg className="step-pointer-svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                  </div>
                </li>
                <li className="step-item-modern">
                  <div className="step-icon">4</div>
                  <div className="step-info">
                    <h3 className="step-title-text">Recibe tu boleto digital</h3>
                    <p className="step-desc-text">Una vez validado el pago, te enviamos tu PDF con folio único.</p>
                  </div>
                </li>
                <li className="step-item-modern">
                  <div className="step-icon">5</div>
                  <div className="step-info">
                    <h3 className="step-title-text">Gran Sorteo</h3>
                    <p className="step-desc-text">25 de Abril, 6:00 PM. ¡Mucha suerte!</p>
                  </div>
                </li>
              </ol>
            </div>

            <div className="payment-column">
              <div className="payment-info-card card-premium-inner">
                <div className="payment-header">
                  <span className="payment-icon-top">💳</span>
                  <h2 className="section-title-sm">Datos de pago</h2>
                  <p className="payment-thanks">
                    ¡Gracias por apoyarnos! Tu aporte directo impulsa nuestra participación nacional.
                  </p>
                </div>

                <div className="payment-details-modern">
                  <div className="payment-field">
                    <span className="field-label">Beneficiaria</span>
                    <div className="field-content">
                      <span className="field-value">Mariana Lopez Garcia</span>
                    </div>
                  </div>

                  <div className="payment-bank-branding">
                    <span className="bank-logo">BBVA</span>
                    <span className="bank-type">Transferencia Interbancaria</span>
                  </div>

                  <div className="payment-field copyable" onClick={() => {
                    navigator.clipboard.writeText("1596786461");
                    alert("Número de cuenta copiado");
                  }}>
                    <span className="field-label">Número de Cuenta</span>
                    <div className="field-content">
                      <span className="field-value mono">1596786461</span>
                      <button className="copy-btn" title="Copiar">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                      </button>
                    </div>
                  </div>

                  <div className="payment-field copyable" onClick={() => {
                    navigator.clipboard.writeText("012180015967864619");
                    alert("CLABE copiada");
                  }}>
                    <span className="field-label">CLABE</span>
                    <div className="field-content">
                      <span className="field-value mono">012180015967864619</span>
                      <button className="copy-btn" title="Copiar">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="payment-footer">
                  <p className="payment-note">
                    <span className="note-icon">✨</span> Envía tu comprobante por WhatsApp para validar tu folio.
                  </p>
                  <a
                    href={`https://wa.me/5214421206701?text=${encodeURIComponent("Hola! Adjunto mi comprobante de pago para la rifa HyperCore\n\n(Adjunta aquí tu foto/captura del comprobante)")}`}
                    className="btn-primary payment-cta-modern"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span>Enviar comprobante</span>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Folio Grid + Dashboard */}
      {/* Folio Grid + Transparency */}
      <section className="dashboard-section">
        {dashboard?.grid && (
          <FolioGrid grid={dashboard.grid} title="¡Escoge tu boleto!" />
        )}
        
        {dashboard && (
          <div className="transparency-footer">
               <p className="transparency-note">
                <strong>Transparencia:</strong> Venta bruta: ${dashboard.raffle_gross.toLocaleString("es-MX")} − Premios: ${dashboard.prize_costs.toLocaleString("es-MX")} = Neto: ${dashboard.raffle_net.toLocaleString("es-MX")}
              </p>
          </div>
        )}
      </section>

      {/* Timeline Journey */}
      <section className="timeline-section">
        <h2 className="section-title" style={{ padding: "0 var(--spacing-4)" }}>Nuestro Camino a Cancún 🚀</h2>
        <div className="timeline-container">
          <div className="timeline-item">
            <div className="timeline-marker"></div>
            <div className="timeline-content">
              <span className="timeline-date">Febrero 2026</span>
              <h3 className="timeline-title">Concepción de la Idea</h3>
              <p className="timeline-desc">
                El equipo HyperCore se formó con la visión de innovar en los procesos industriales. 
                Nació el concepto de "Digital Paintshop" para el KIA Challenge.
              </p>
            </div>
          </div>

          <div className="timeline-item">
            <div className="timeline-marker"></div>
            <div className="timeline-content">
              <span className="timeline-date">Marzo 2026</span>
              <h3 className="timeline-title">Desarrollo y Prototipado</h3>
              <p className="timeline-desc">
                Semanas intensas de diseño, programación y validación. Nuestro prototipo fue seleccionado 
                para representar a nuestra sede a nivel nacional.
              </p>
            </div>
          </div>

          <div className="timeline-item active">
            <div className="timeline-marker"></div>
            <div className="timeline-content">
              <span className="timeline-date">Abril 2026</span>
              <h3 className="timeline-title">Recaudación y Gran Sorteo</h3>
              <p className="timeline-desc">
                Organizamos esta rifa benéfica para cubrir los viáticos y llevar nuestro proyecto a 
                las grandes ligas. ¡Aquí es donde tú eres clave! El sorteo será el 25 de abril.
              </p>
            </div>
          </div>

          <div className="timeline-item">
            <div className="timeline-marker"></div>
            <div className="timeline-content">
              <span className="timeline-date">Mayo 2026</span>
              <h3 className="timeline-title">Final Nacional KIA Innovation</h3>
              <p className="timeline-desc">
                Viajaremos a Cancún para competir con las mejores universidades del país, presentar nuestro 
                Digital Paintshop y poner en alto el nombre de Tecmilenio.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="contact-section">
        <h2 className="section-title">Contacto</h2>
        <div className="contact-links">
          <a
            href={`https://wa.me/5214421206701?text=${encodeURIComponent("Hola! Tengo una pregunta sobre la rifa HyperCore\n\n")}`}
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
