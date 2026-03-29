import "./PrivacyPage.css";

export default function PrivacyPage() {
  return (
    <div className="privacy-page">
      <h1 className="page-heading">Aviso de Privacidad</h1>

      <div className="privacy-content">
        <section className="privacy-section">
          <h2 className="privacy-subtitle">Datos que recopilamos</h2>
          <p>
            Para participar en el sorteo, únicamente recopilamos tu nombre
            completo y número de teléfono. No solicitamos correo electrónico,
            dirección, ni ningún otro dato personal.
          </p>
        </section>

        <section className="privacy-section">
          <h2 className="privacy-subtitle">Uso de la información</h2>
          <p>
            Tus datos se utilizan exclusivamente para la gestión del sorteo
            benéfico organizado por Team HyperCore. Esto incluye el registro de
            tu boleto, la generación de tu folio único y la comunicación de
            resultados en caso de ser ganador.
          </p>
        </section>

        <section className="privacy-section">
          <h2 className="privacy-subtitle">Eliminación de datos</h2>
          <p>
            Todos los datos personales serán eliminados una vez que el sorteo
            haya concluido y se hayan anunciado los resultados del KIA Mexico
            Innovation MeetUp 2026. No conservamos información personal más allá
            de lo necesario.
          </p>
        </section>

        <section className="privacy-section">
          <h2 className="privacy-subtitle">Compartición de datos</h2>
          <p>
            Tu información personal no será compartida, vendida ni transferida a
            terceros bajo ninguna circunstancia. Los datos son accesibles
            únicamente por los miembros de Team HyperCore responsables de la
            organización del sorteo.
          </p>
        </section>

        <section className="privacy-section">
          <h2 className="privacy-subtitle">Contacto</h2>
          <p>
            Si tienes preguntas sobre el manejo de tus datos, contáctanos por{" "}
            <a
              href="https://wa.me/5218000000000"
              target="_blank"
              rel="noopener noreferrer"
            >
              WhatsApp
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
