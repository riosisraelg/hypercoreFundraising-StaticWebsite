import { useState, useEffect, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import { api, ApiError } from "../../lib/api";
import "./ValidatePage.css";

interface TicketValidationResponse {
  id: string;
  folio: string;
  status: "active" | "cancelled";
  full_name: string;
}

export default function ValidatePage() {
  const { ticketId } = useParams<{ ticketId: string }>();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<TicketValidationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!ticketId);
  const [searchId, setSearchId] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const extractTicketId = (decodedText: string) => {
    // Regex for UUID v4
    const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;
    const match = decodedText.match(uuidRegex);
    
    if (match) {
      return match[0];
    }

    // Fallback to old segment logic if no UUID found (unlikely for our tickets)
    try {
      const url = new URL(decodedText);
      const pathSegments = url.pathname.split('/').filter(Boolean);
      return pathSegments[pathSegments.length - 1] || decodedText.trim();
    } catch {
      return decodedText.trim();
    }
  };

  useEffect(() => {
    async function validateTicket() {
      if (!ticketId) {
        return;
      }
      try {
        const data = await api.get<TicketValidationResponse>(`/tickets/${ticketId}/validate`, false);
        setTicket(data);
      } catch (err: unknown) {
        if (err instanceof ApiError && err.status === 404) {
          setError("Boleto no encontrado.");
        } else {
          setError("Error validando el boleto. Intenta de nuevo.");
        }
      } finally {
        setLoading(false);
      }
    }

    if (ticketId) {
      validateTicket();
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, [ticketId]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (searchId.trim()) {
      navigate(`/validate/${searchId.trim()}`);
    }
  }

  const startScanning = async () => {
    setScanError(null);
    setIsScanning(true);
    const html5Qrcode = new Html5Qrcode("reader");
    scannerRef.current = html5Qrcode;

    try {
      await html5Qrcode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          const id = extractTicketId(decodedText);
          html5Qrcode.stop().then(() => {
            setIsScanning(false);
            navigate(`/validate/${id}`);
          });
        },
        () => {} // silent scan failure
      );
    } catch (err) {
      setScanError("No se pudo acceder a la cámara. Revisa los permisos.");
      setIsScanning(false);
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        setIsScanning(false);
      } catch (err) {
        console.error("Error stopping scanner", err);
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanError(null);
    const html5Qrcode = new Html5Qrcode("reader-hidden");
    try {
      const decodedText = await html5Qrcode.scanFile(file, true);
      const id = extractTicketId(decodedText);
      navigate(`/validate/${id}`);
    } catch (err) {
      setScanError("No se detectó ningún código QR en la imagen.");
    }
  };

  if (!ticketId) {
    return (
      <main className="validate-page">
        <div className="validate-container search">
          <h1>Validar Boleto</h1>
          <p className="detail" style={{ marginBottom: "1.5rem" }}>
            Ingresa, escanea o sube una foto del código de tu boleto para consultar su validez.
          </p>

          {!isScanning ? (
            <div className="validate-actions">
              <div className="action-buttons">
                <button onClick={startScanning} className="btn-primary flex-center">
                  <span className="icon">📷</span> Escanear con Cámara
                </button>
                <button onClick={() => fileInputRef.current?.click()} className="btn-secondary flex-center">
                  <span className="icon">🖼️</span> Cargar desde Galería
                </button>
              </div>

              <div className="divider">O ingresa el código manualmente</div>

              <form className="validate-search-form" onSubmit={handleSearch}>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Ej: f47ac10b-58cc-4372-..."
                  value={searchId}
                  onChange={(e) => setSearchId(e.target.value)}
                  required
                />
                <button type="submit" className="btn-accent" style={{ marginTop: "1rem", width: "100%" }}>
                  Verificar Estado
                </button>
              </form>
            </div>
          ) : (
            <div className="scanner-view">
              <div id="reader" style={{ width: "100%", maxWidth: "400px", margin: "0 auto" }}></div>
              <button onClick={stopScanning} className="btn-outline" style={{ marginTop: "1.5rem" }}>
                Cancelar Escaneo
              </button>
            </div>
          )}

          {scanError && <p className="scan-error">{scanError}</p>}
          
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            accept="image/*" 
            style={{ display: "none" }} 
          />
          <div id="reader-hidden" style={{ display: "none" }}></div>

          <Link to="/" className="btn-ghost" style={{ marginTop: "2rem" }}>Regresar al Sorteo</Link>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="validate-page">
        <div className="validate-container loading">
          <svg className="spinner" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="path"></circle>
          </svg>
          <p>Validando boleto...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="validate-page">
        <div className="validate-container error">
          <div className="status-icon">⚠️</div>
          <h1>Boleto Inválido</h1>
          <p className="detail">{error}</p>
          <Link to="/" className="btn-primary">Ir al Inicio</Link>
        </div>
      </main>
    );
  }

  if (ticket) {
    const isActive = ticket.status === "active";
    return (
      <main className="validate-page">
        <div className={`validate-container ${isActive ? "active" : "cancelled"}`}>
          <div className="status-badge">
            {isActive ? "✓ BOLETO VÁLIDO" : "✗ BOLETO CANCELADO"}
          </div>
          <div className="ticket-details">
            <div className="detail-row">
              <span className="label">FOLIO</span>
              <span className="value folio">{ticket.folio}</span>
            </div>
            <div className="detail-row">
              <span className="label">PARTICIPANTE</span>
              <span className="value">{ticket.full_name}</span>
            </div>
          </div>
          <Link to="/" className="btn-primary" style={{ marginTop: '2rem' }}>Regresar al Sorteo</Link>
        </div>
      </main>
    );
  }

  return null;
}
