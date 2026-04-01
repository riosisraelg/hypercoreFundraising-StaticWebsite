import "./FolioGrid.css";

const WA_NUMBER = "5214421206701";

interface FolioCell {
  number: number;
  status: "available" | "sold" | "cancelled";
}

interface FolioGridProps {
  grid: FolioCell[];
  title?: string;
}

function openWhatsApp(folio: string, status: "available" | "cancelled") {
  const msg =
    status === "available"
      ? `Hola! Me interesa el boleto *${folio}* del Sorteo HyperCore 🎟️ ¿Está disponible? ¿Cómo puedo comprarlo?`
      : `Hola! Vi que el boleto *${folio}* fue liberado en el Sorteo HyperCore 🎟️ ¿Puedo comprarlo?`;
  const url = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

export default function FolioGrid({ grid, title = "Boletos" }: FolioGridProps) {
  return (
    <div className="folio-grid-wrapper">
      {title && <h2 className="section-title">{title}</h2>}

      <div className="folio-legend">
        <span className="legend-item">
          <span className="legend-dot available" />
          Disponible — haz clic para apartar
        </span>
        <span className="legend-item">
          <span className="legend-dot sold" />
          Vendido
        </span>
        <span className="legend-item">
          <span className="legend-dot cancelled" />
          Liberado — fue vendido pero se canceló, ¡puedes comprarlo!
        </span>
      </div>

      <div className="folio-grid">
        {grid.map((cell) => {
          const folio = `HC-${String(cell.number).padStart(3, "0")}`;
          const clickable = cell.status === "available" || cell.status === "cancelled";

          return (
            <div
              key={cell.number}
              className={`folio-cell folio-${cell.status}${clickable ? " folio-clickable" : ""}`}
              title={
                cell.status === "sold"
                  ? `${folio} — Vendido`
                  : cell.status === "cancelled"
                  ? `${folio} — Liberado, ¡disponible para comprar!`
                  : `${folio} — Disponible, clic para apartar`
              }
              onClick={clickable ? () => openWhatsApp(folio, cell.status as "available" | "cancelled") : undefined}
              role={clickable ? "button" : undefined}
              tabIndex={clickable ? 0 : undefined}
              onKeyDown={
                clickable
                  ? (e) => e.key === "Enter" && openWhatsApp(folio, cell.status as "available" | "cancelled")
                  : undefined
              }
            >
              {cell.number}
            </div>
          );
        })}
      </div>
    </div>
  );
}
