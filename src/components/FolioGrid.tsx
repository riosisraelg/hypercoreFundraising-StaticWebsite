import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getToken } from "../lib/api";
import "./FolioGrid.css";

const WA_NUMBER = "5214421206701";

interface FolioCell {
  number: number;
  status: "available" | "sold" | "pending";
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
  onReassign?: (ticketId: string) => void;
}

function openWhatsApp(folio: string, status: "available" | "pending") {
  const msg =
    status === "available"
      ? `Hola! Quiero apartar un boleto del Sorteo HyperCore

Cantidad de boletos: 1
Folio que quiero: *${folio}*
Nombre completo: 
Teléfono: 

¿Los datos son correctos?

(Adjunta tu foto/captura de comprobante de pago)`
      : `Hola! Vi que el boleto *${folio}* está pendiente en el Sorteo HyperCore

Cantidad de boletos: 1
Folio que quiero: *${folio}*
Nombre completo: 
Teléfono: 

¿Los datos son correctos?

(Adjunta tu foto/captura de comprobante de pago)`;
  window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`, "_blank", "noopener,noreferrer");
}

export default function FolioGrid({ grid, title = "Boletos", mode = "public", tickets = [], onCancel, onDownloadPdf, onReassign }: FolioGridProps) {
  const [selectedCell, setSelectedCell] = useState<FolioCell | null>(null);
  const [selectedFolios, setSelectedFolios] = useState<number[]>([]);
  const navigate = useNavigate();
  const token = getToken();

  const handleCellClick = (folio: string, cell: FolioCell) => {
    if (mode === "admin") {
      setSelectedCell(cell === selectedCell ? null : cell);
    } else {
      if (cell.status === "available") {
        setSelectedFolios(prev => 
          prev.includes(cell.number) 
            ? prev.filter(n => n !== cell.number) 
            : [...prev, cell.number]
        );
      }
    }
  };

  const handleReserveMultiple = () => {
    if (token) {
      // Map back to HC-xxx format for the URL
      const foliosStr = selectedFolios.map(n => `HC-${String(n).padStart(3, "0")}`).join(",");
      navigate(`/user/reserve/${foliosStr}`);
    } else {
      navigate("/login");
    }
  };

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
          <span className="legend-dot pending" />
          Pendiente — pago en proceso
        </span>
      </div>

      <div className="folio-grid">
        {grid.map((cell) => {
          const folio = `HC-${String(cell.number).padStart(3, "0")}`;
          const isClickable = mode === "admin" || cell.status === "available";

          return (
            <div
              key={cell.number}
              className={`folio-cell folio-${cell.status}${isClickable ? " folio-clickable" : ""}${selectedCell?.number === cell.number ? " folio-selected" : ""}${selectedFolios.includes(cell.number) ? " folio-selected-multi" : ""}`}
              title={
                cell.status === "sold"
                  ? `${folio} — Vendido`
                  : cell.status === "pending"
                  ? `${folio} — Pendiente`
                  : `${folio} — Disponible`
              }
              onClick={isClickable ? () => handleCellClick(folio, cell) : undefined}
              role={isClickable ? "button" : undefined}
              tabIndex={isClickable ? 0 : undefined}
              onKeyDown={
                isClickable
                  ? (e) => {
                      if (e.key === "Enter") {
                        handleCellClick(folio, cell);
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

      {/* Multi-Select Floating Bar */}
      {mode === "public" && selectedFolios.length > 0 && (
        <div className="multi-select-bar">
          <span>{selectedFolios.length} folio{selectedFolios.length !== 1 ? 's' : ''} seleccionado{selectedFolios.length !== 1 ? 's' : ''} (${(selectedFolios.length * 200).toLocaleString("es-MX")} MXN)</span>
          <button className="btn-primary" onClick={handleReserveMultiple}>Reservar Boletos</button>
        </div>
      )}

      {/* Admin popup */}
      {mode === "admin" && selectedCell && (
        <div className="folio-popup-overlay" onClick={() => setSelectedCell(null)}>
          <div className="card-elevated folio-popup" onClick={(e) => e.stopPropagation()}>
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
                    <span className={`chip chip-${selectedCell.status === "sold" ? "active" : selectedCell.status === "pending" ? "pending" : "available"}`} style={{ 
                      ...(selectedCell.status === "available" ? { background: "var(--surface-container-low)", color: "var(--on-surface)", border: "1px solid var(--outline)" } : {})
                    }}>
                      {selectedCell.status === "sold" ? "Vendido" : selectedCell.status === "pending" ? "Pendiente" : "Disponible"}
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
                        {selectedCell.status === "pending" && (
                          <button className="btn-secondary btn-sm" onClick={() => openWhatsApp(folioNumber, "pending")}>
                            Compartir Link (Pendiente)
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="folio-popup-available">
                      <p className="label-meta" style={{ marginBottom: "1rem" }}>Este folio está disponible para ser asignado.</p>
                      <div className="folio-popup-actions">
                        <button className="btn-primary btn-sm" onClick={() => {
                          window.location.href = `/admin/tickets/new?folio=${folioNumber}`;
                        }}>Registrar Venta (Manual)</button>
                        <button className="btn-secondary btn-sm" onClick={() => openWhatsApp(folioNumber, "available")}>
                          Compartir por WhatsApp
                        </button>
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
