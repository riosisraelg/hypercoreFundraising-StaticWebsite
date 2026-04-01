import { useState } from "react";
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
  const msg =
    status === "available"
      ? `Hola! 👋 Quiero apartar un boleto del Sorteo HyperCore 🎟️

Cantidad de boletos: 1
Folio que quiero: *${folio}*
Nombre completo: 
Teléfono: 

¿Los datos son correctos?

📎 (Adjunta tu foto/captura de comprobante de pago)`
      : `Hola! 👋 Vi que el boleto *${folio}* fue liberado en el Sorteo HyperCore 🎟️

Cantidad de boletos: 1
Folio que quiero: *${folio}*
Nombre completo: 
Teléfono: 

¿Los datos son correctos?

📎 (Adjunta tu foto/captura de comprobante de pago)`;
  window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`, "_blank", "noopener,noreferrer");
}

export default function FolioGrid({ grid, title = "Boletos", mode = "public", tickets = [], onCancel, onDownloadPdf }: FolioGridProps) {
  const [selectedCell, setSelectedCell] = useState<FolioCell | null>(null);

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
          const isClickable = mode === "admin" || cell.status === "available" || cell.status === "cancelled";

          return (
            <div
              key={cell.number}
              className={`folio-cell folio-${cell.status}${isClickable ? " folio-clickable" : ""}${selectedCell?.number === cell.number ? " folio-selected" : ""}`}
              title={
                cell.status === "sold"
                  ? `${folio} — Vendido`
                  : cell.status === "cancelled"
                  ? `${folio} — Liberado, ¡disponible para comprar!`
                  : `${folio} — Disponible`
              }
              onClick={isClickable ? () => {
                if (mode === "admin") {
                  setSelectedCell(cell === selectedCell ? null : cell);
                } else {
                  openWhatsApp(folio, cell.status as "available" | "cancelled");
                }
              } : undefined}
              role={isClickable ? "button" : undefined}
              tabIndex={isClickable ? 0 : undefined}
              onKeyDown={
                isClickable
                  ? (e) => {
                      if (e.key === "Enter") {
                        if (mode === "admin") {
                          setSelectedCell(cell === selectedCell ? null : cell);
                        } else {
                          openWhatsApp(folio, cell.status as "available" | "cancelled");
                        }
                      }
                    }
                  : undefined
              }
            >
              {cell.number}
            </div>
          );
        })}
      </div>

      {/* Admin popup */}
      {mode === "admin" && selectedCell && (
        <div className="card-elevated folio-popup">
          <button className="folio-popup-close" onClick={() => setSelectedCell(null)}>✕</button>
          
          {(() => {
            const folioNumber = `HC-${String(selectedCell.number).padStart(3, "0")}`;
            const ticketList = tickets.filter(t => t.folio === folioNumber);
            const activeTicket = ticketList.find(t => t.status === "active");
            const anyTicket = activeTicket || ticketList[0];
            
            return (
              <>
                <div className="folio-popup-header">
                  <span className="page-subheading" style={{ margin: 0 }}>Folio {folioNumber}</span>
                  <span className={`chip chip-${selectedCell.status === "sold" ? "active" : "cancelled"}`} style={{ 
                    ...(selectedCell.status === "available" ? { background: "var(--surface-container-low)", color: "var(--on-surface)", border: "1px solid var(--outline)" } : {})
                  }}>
                    {selectedCell.status === "sold" ? "Vendido" : selectedCell.status === "cancelled" ? "Cancelado" : "Disponible"}
                  </span>
                </div>
                
                {anyTicket ? (
                  <div className="folio-popup-info">
                    <div>
                      <span className="label-meta">Comprador</span>
                      <span>{anyTicket.full_name}</span>
                    </div>
                    <div>
                      <span className="label-meta">Teléfono</span>
                      <span>{anyTicket.phone}</span>
                    </div>
                    <div>
                      <span className="label-meta">Fecha</span>
                      <span>{new Date(anyTicket.created_at).toLocaleString("es-MX")}</span>
                    </div>
                    
                    <div className="folio-popup-actions" style={{ marginTop: "1rem" }}>
                      {selectedCell.status === "sold" && activeTicket && onCancel && (
                        <button className="btn-accent btn-sm" onClick={() => {
                          if (window.confirm(`¿Seguro que deseas cancelar el boleto ${folioNumber}?`)) {
                            onCancel(activeTicket.id);
                            setSelectedCell(null);
                          }
                        }}>Cancelar Boleto</button>
                      )}
                      {selectedCell.status === "sold" && activeTicket && onDownloadPdf && (
                        <button className="btn-primary btn-sm" onClick={() => onDownloadPdf(activeTicket.id, activeTicket.folio)}>Descargar PDF</button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="folio-popup-available">
                    <p className="label-meta">No hay datos de compra asociados a este folio.</p>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}
