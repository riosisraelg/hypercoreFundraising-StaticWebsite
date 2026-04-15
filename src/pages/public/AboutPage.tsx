import "./AboutPage.css";

interface TeamMember {
  name: string;
  role: string;
  linkedin: string;
  initials: string;
  photo?: string;
}

const TEAM_MEMBERS: TeamMember[] = [
  {
    name: "Fernando Israel Rios Garcia",
    role: "Desarrollo de Software",
    linkedin: "https://www.linkedin.com/posts/riosisraelg_i-am-happy-of-participating-in-innovation-activity-7444273333631746049-kodH",
    initials: "IR",
    photo: "/team/israel.jpg",
  },
  {
    name: "Mariana Lopez Garcia",
    role: "Ingeniería Mecatrónica",
    linkedin: "https://www.linkedin.com/posts/mariana-lopez-garcia-40b960348_reconocimiento-imu2026-activity-7444445164384849920-48H4",
    initials: "ML",
    photo: "/team/mariana.jpeg",
  },
  {
    name: "Diego Santiago Saucedo García",
    role: "Ingeniería Mecatrónica",
    linkedin: "https://www.linkedin.com/posts/diego-saucedo-garc%C3%ADa-3a485b337_emocionado-de-compartir-este-logro-me-share-7444458337804558336-QbL-",
    initials: "DS",
  },
  {
    name: "Ana Sarai Zuñiga Esquivel",
    role: "Ingeniería Industrial",
    linkedin: "https://linkedin.com/in/miembro4",
    initials: "AZ",
  },
];

export default function AboutPage() {
  return (
    <div className="about-page">
      <div className="about-layout">
        {/* Left: Info */}
        <div className="about-info">
          <section className="about-intro">
            <h1 className="page-heading">Sobre Team HyperCore</h1>
            <p className="about-lead">
              Somos un equipo de 5 estudiantes de ingeniería de la Universidad
              Tecmilenio. Ganamos la fase regional del KIA Mexico Innovation MeetUp
              2026 con nuestro proyecto de Digital Paint Shop — una solución de
              Industria 4.0 para digitalizar procesos de pintura automotriz.
            </p>
            <p className="about-text">
              Ahora estamos clasificados a la final nacional en Cancún y necesitamos
              recaudar fondos para cubrir vuelos, hospedaje y alimentación de 4
              integrantes durante 4 días. Este sorteo es nuestra forma de lograrlo,
              y cada boleto nos acerca más a la meta.
            </p>
          </section>

          <section className="about-challenge">
            <h2 className="section-title">El Reto KIA</h2>
            <p className="about-text">
              El KIA Mexico Innovation MeetUp desafía a equipos universitarios a
              resolver problemas reales de la industria automotriz usando tecnología
              de vanguardia. Nuestro proyecto se enfoca en la digitalización del
              proceso de pintura (Digital Paint Shop), aplicando sensores IoT,
              análisis de datos y automatización para mejorar la calidad y eficiencia
              en líneas de producción.
            </p>
          </section>

          <p className="about-certificates">
            Puedes verificar nuestras certificaciones del Innovation MeetUp en el
            perfil de LinkedIn de cada integrante.
          </p>
        </div>

        {/* Right: Team grid */}
        <div className="about-team-side">
          <h2 className="section-title">Nuestro Equipo</h2>
          <div className="team-grid">
            {TEAM_MEMBERS.map((member) => (
              <article key={member.name} className="team-card card-elevated">
                {member.photo ? (
                  <img
                    src={member.photo}
                    alt={member.name}
                    className="team-photo"
                  />
                ) : (
                  <div className="team-avatar" aria-hidden="true">
                    {member.initials}
                  </div>
                )}
                <span className="team-name">{member.name}</span>
                <span className="team-role">{member.role}</span>
                <a
                  href={member.linkedin}
                  className="team-linkedin"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  LinkedIn →
                </a>
              </article>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
