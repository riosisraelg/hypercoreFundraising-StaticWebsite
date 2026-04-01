import "./FolioGrid.css";

const WA_NUMBER = "5214421206701";

interface FolioCell {
  number: number;
  status: "available" | "sold" | "cancelled";
}

export interface TicketInfo {
  id: string;
  folio: string;
  full_name: string;
  phone: string;
  status: string;
  created_at: string;
}

interface FolioGridProps {
  grid: FolioCell[];
  title?: string;
  mode?: "public" | "admin";
  tickets?: TicketInfo[];
  onCancel?: (ticketId: string) => Promise<void>;
  onDownloadPdf?: (ticketId: string, folio: string) => void;
}

function openWhatsApp(folio: string, status: "available" | "cancelled") {
  const folioLine = `Folio(s) que quiero: *${folio}* (o aleatorio si no importa)`;
  const msg =
    status === "available"
      ? `Hola! 👋 Quiero apartar un boleto del Sorteo HyperCore 🎟️

Mi nombre: [tu nombre]
Mi teléfono: [tu número]
${folioLine}
Cantidad de boletos: 1

📎 [Adjunta tu comprobante de pago]

¿Sigue disponible? 😊`
      : `Hola! 👋 Vi que el boleto *${folio}* fue liberado en el Sorteo HyperCore 🎟️

Mi nombre: [tu nombre]
Mi teléfono: [tu número]
Folio(s) que quiero: *${folio}*
Cantidad de boletos: 1

📎 [Adjunta tu comprobante de pago]

¿Puedo comprarlo? 😊`;
  window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`, "_blank", "noopener,noreferrer");
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
