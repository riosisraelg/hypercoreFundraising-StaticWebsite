import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import * as pdfjsLib from "pdfjs-dist";
import { api, ApiError } from "../../lib/api";
import "../public/ValidatePage.css";

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

interface TicketValidationResponse {
  id: string;
  folio: string;
  status: "active" | "pending";
  full_name: string;
}

export default function VerifyAdminPage() {
  const { ticketId } = useParams<{ ticketId: string }>();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<TicketValidationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!ticketId);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchId, setSearchId] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      await api.patch(`/tickets/${ticketId}/approve`, undefined, true);
      setTicket(prev => prev ? { ...prev, status: "active" } : null);
    } catch {
      alert("Error al aprobar el boleto.");
    } finally { setActionLoading(false); }
  };

  const handleDelete = async () => {
    if(!window.confirm("¿Seguro que deseas liberar este folio permanentemente?")) return;
    setActionLoading(true);
    try {
      await api.patch(`/tickets/${ticketId}/cancel`, undefined, true);
      navigate("/admin/verify");
    } catch {
      alert("Error al liberar el boleto.");
    } finally { setActionLoading(false); }
  };

  /** Extract a UUID from any string (URL, raw text, etc.) */
  const extractTicketId = useCallback((decodedText: string): string => {
    const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;
    const match = decodedText.match(uuidRegex);
    if (match) return match[0];

    try {
      const url = new URL(decodedText);
      const segments = url.pathname.split("/").filter(Boolean);
      return segments[segments.length - 1] || decodedText.trim();
    } catch {
      return decodedText.trim();
    }
  }, []);

  // ── Validate ticket when ticketId changes ──
  useEffect(() => {
    if (!ticketId) return;

    let cancelled = false;
    setLoading(true);
    setError(null);
    setTicket(null);

    (async () => {
      try {
        const data = await api.get<TicketValidationResponse>(
          `/tickets/${ticketId}/validate`,
          false,
        );
        if (!cancelled) setTicket(data);
      } catch (err: unknown) {
        if (!cancelled) {
          if (err instanceof ApiError && err.status === 404) {
            setError("Boleto no encontrado.");
          } else {
            setError("Error validando el boleto. Intenta de nuevo.");
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ticketId]);

  // ── Cleanup scanner on unmount ──
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, []);

  // ── Start camera AFTER the reader div is in the DOM ──
  useEffect(() => {
    if (!isScanning) return;

    const readerEl = document.getElementById("reader");
    if (!readerEl) return;

    const html5Qrcode = new Html5Qrcode("reader");
    scannerRef.current = html5Qrcode;

    html5Qrcode
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (decodedText) => {
          const id = extractTicketId(decodedText);
          html5Qrcode.stop().then(() => {
            scannerRef.current = null;
            setIsScanning(false);
            navigate(`/admin/verify/${id}`);
          });
        },
        () => {}, // silent per-frame failure
      )
      .catch(() => {
        setScanError("No se pudo acceder a la camara. Revisa los permisos del navegador.");
        setIsScanning(false);
      });
  }, [isScanning, extractTicketId, navigate]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const raw = searchId.trim();
    if (raw) {
      const id = extractTicketId(raw);
      navigate(`/admin/verify/${id}`);
    }
  }

  const stopScanning = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
      } catch {
        // ignore
      }
    }
    setIsScanning(false);
  };

  /** Process an image File through the QR scanner */
  const scanImageFile = async (imageFile: File): Promise<string> => {
    const html5Qrcode = new Html5Qrcode("reader-hidden");
    try {
      return await html5Qrcode.scanFile(imageFile, true);
    } finally {
      html5Qrcode.clear();
    }
  };

  /** Render a PDF page 1 to a PNG File */
  const pdfToImage = async (pdfFile: File): Promise<File> => {
    const arrayBuffer = await pdfFile.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 2.5 });

    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas context not available");

    await page.render({ canvasContext: ctx, viewport }).promise;

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error("Blob conversion failed"));
          resolve(new File([blob], "pdf-render.png", { type: "image/png" }));
        },
        "image/png",
      );
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = "";

    setScanError(null);
    setProcessing(true);

    try {
      let imageFile: File;

      if (file.type === "application/pdf") {
        imageFile = await pdfToImage(file);
      } else {
        imageFile = file;
      }

      const decodedText = await scanImageFile(imageFile);
      const id = extractTicketId(decodedText);
      navigate(`/admin/verify/${id}`);
    } catch {
      const fileType = file.type === "application/pdf" ? "PDF" : "imagen";
      setScanError(`No se detecto ningun codigo QR en el archivo ${fileType}.`);
    } finally {
      setProcessing(false);
    }
  };

  // ── RENDER: Search / Scan form ──
  if (!ticketId) {
    return (
      <main className="validate-page">
        <div className="validate-container search">
          <div className="validate-header-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 7V5a2 2 0 0 1 2-2h2" />
              <path d="M17 3h2a2 2 0 0 1 2 2v2" />
              <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
              <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
              <rect x="7" y="7" width="10" height="10" rx="1" />
            </svg>
          </div>
          <h1>Validar Boleto</h1>
          <p className="validate-subtitle">
            Verifica la autenticidad de tu boleto del sorteo HyperCore.
          </p>

          {processing && (
            <div className="processing-overlay">
              <svg className="spinner" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="path" />
              </svg>
              <p>Procesando archivo...</p>
            </div>
          )}

          {!isScanning && !processing && (
            <div className="validate-actions">
              <div className="action-buttons">
                <button
                  onClick={() => {
                    setScanError(null);
                    setIsScanning(true);
                  }}
                  className="btn-primary flex-center"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                  Escanear con Camara
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="btn-secondary flex-center"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  Subir Imagen o PDF
                </button>
              </div>

              <div className="divider">o ingresa el codigo</div>

              <form className="validate-search-form" onSubmit={handleSearch}>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Pega aqui tu codigo de boleto..."
                  value={searchId}
                  onChange={(e) => setSearchId(e.target.value)}
                  required
                />
                <button type="submit" className="btn-accent" style={{ marginTop: "0.75rem", width: "100%" }}>
                  Consultar
                </button>
              </form>
            </div>
          )}

          {isScanning && (
            <div className="scanner-view">
              <p className="scanner-hint">Apunta al codigo QR de tu boleto</p>
              <div id="reader" />
              <button onClick={stopScanning} className="btn-outline" style={{ marginTop: "1rem" }}>
                Cancelar
              </button>
            </div>
          )}

          {scanError && <p className="scan-error">{scanError}</p>}

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*,application/pdf"
            style={{ display: "none" }}
          />
          <div id="reader-hidden" style={{ display: "none" }} />

          <Link to="/admin/dashboard" className="btn-ghost" style={{ marginTop: "1.5rem" }}>
            Regresar al Tablero
          </Link>
        </div>
      </main>
    );
  }

  // ── RENDER: Loading ──
  if (loading) {
    return (
      <main className="validate-page">
        <div className="validate-container loading">
          <svg className="spinner" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="path" />
          </svg>
          <p>Validando boleto...</p>
        </div>
      </main>
    );
  }

  // ── RENDER: Error ──
  if (error) {
    return (
      <main className="validate-page">
        <div className="validate-container error">
          <div className="status-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#c62828" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <h1>Boleto No Encontrado</h1>
          <p className="detail">{error}</p>
          <div className="error-actions">
            <Link to="/admin/verify" className="btn-primary">Atrás</Link>
            <Link to="/admin/dashboard" className="btn-ghost">Ir a Tablero</Link>
          </div>
        </div>
      </main>
    );
  }

  // ── RENDER: Ticket result ──
  if (ticket) {
    const isActive = ticket.status === "active";
    return (
      <main className="validate-page">
        <div className={`validate-container ${isActive ? "active" : "pending"}`}>
          <div className="status-badge">
            {isActive ? (
              <><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg> BOLETO ACTIVO/PAGADO</>
            ) : (
              <><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg> BOLETO PENDIENTE DE PAGO</>
            )}
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
          <div style={{ marginTop: 'var(--spacing-6)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
            {!isActive && (
              <button 
                className="btn-primary" 
                onClick={handleApprove} 
                disabled={actionLoading}
                style={{ width: '100%', background: '#2e7d32' }}>
                {actionLoading ? "Validando..." : "Validar Boleto"}
              </button>
            )}
            <button 
              className="btn-secondary" 
              onClick={handleDelete} 
              disabled={actionLoading}
              style={{ width: '100%', borderColor: 'red', color: 'red' }}>
              {actionLoading ? "Liberando..." : "Liberar Folio (Eliminar)"}
            </button>
          </div>
          <div className="result-actions" style={{ marginTop: 'var(--spacing-6)' }}>
            <Link to="/admin/verify" className="btn-ghost">Validar Otro Boleto</Link>
          </div>
        </div>
      </main>
    );
  }

  return null;
}
