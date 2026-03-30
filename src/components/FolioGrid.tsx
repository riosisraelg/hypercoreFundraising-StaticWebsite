import "./FolioGrid.css";

interface FolioCell {
  number: number;
  status: "available" | "sold" | "cancelled";
}

interface FolioGridProps {
  grid: FolioCell[];
  title?: string;
}

export default function FolioGrid({ grid, title = "Boletos" }: FolioGridProps) {
  return (
    <div className="folio-grid-wrapper">
      {title && <h2 className="section-title">{title}</h2>}
      <div className="folio-legend">
        <span className="legend-item"><span className="legend-dot available" /> Disponible</span>
        <span className="legend-item"><span className="legend-dot sold" /> Vendido</span>
        <span className="legend-item"><span className="legend-dot cancelled" /> Cancelado</span>
      </div>
      <div className="folio-grid">
        {grid.map((cell) => (
          <div
            key={cell.number}
            className={`folio-cell folio-${cell.status}`}
            title={`HC-${String(cell.number).padStart(3, "0")} — ${
              cell.status === "sold" ? "Vendido" : cell.status === "cancelled" ? "Cancelado" : "Disponible"
            }`}
          >
            {cell.number}
          </div>
        ))}
      </div>
    </div>
  );
}
