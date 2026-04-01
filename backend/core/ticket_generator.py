"""
Ticket file generators for the HyperCore Gift Draw Platform.

Generates downloadable ticket files in PDF format.
Design follows the Industrial Tech-Editorial design system from DESIGN.md:
- Primary #00534C (deep authoritative teal)
- Secondary/Accent #DCFF52 / #CEF145 (high-visibility electric lime)
- Surface #f8f9ff, Surface-container-low #eff4ff
- No borders, tonal layering, monolithic feel
- Typography: Helvetica-Bold for headings (industrial), Helvetica for body (precision)
"""

import io
from datetime import date

from reportlab.lib.pagesizes import A6
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor
from reportlab.pdfgen import canvas
from reportlab.graphics.shapes import Drawing, Rect, String
from reportlab.graphics import renderPDF

# Draw event constants
DRAW_TITLE = "Sorteo HyperCore — Innovation MeetUp 2026"
DRAW_DATE = "25 de Abril, 2026 — 6:00 PM"
BRAND_NAME = "HYPERCORE"
BRAND_TAGLINE = "UNIVERSIDAD TECMILENIO"
CHALLENGE_NAME = "KIA Challenge: Digital Paintshop"

# Design System Colors
PRIMARY = HexColor("#00534C")
PRIMARY_DARK = HexColor("#003a35")
ACCENT = HexColor("#DCFF52")
ACCENT_DIM = HexColor("#CEF145")
SURFACE = HexColor("#f8f9ff")
SURFACE_LOW = HexColor("#eff4ff")
SURFACE_HIGH = HexColor("#d5e3fc")
ON_PRIMARY = HexColor("#ffffff")
ON_SURFACE = HexColor("#0d1c2e")
ON_SURFACE_MUTED = HexColor("#5a6a7a")
PRIMARY_FIXED_DIM = HexColor("#91d3c9")


def _draw_rounded_rect(c, x, y, w, h, radius, fill_color):
    """Draw a rounded rectangle (simulated with reportlab path)."""
    c.setFillColor(fill_color)
    p = c.beginPath()
    p.moveTo(x + radius, y)
    p.lineTo(x + w - radius, y)
    p.arcTo(x + w - radius, y, x + w, y + radius, -90, 90)
    p.lineTo(x + w, y + h - radius)
    p.arcTo(x + w - radius, y + h - radius, x + w, y + h, 0, 90)
    p.lineTo(x + radius, y + h)
    p.arcTo(x, y + h - radius, x + radius, y + h, 90, 90)
    p.lineTo(x, y + radius)
    p.arcTo(x, y, x + radius, y + radius, 180, 90)
    p.close()
    c.drawPath(p, fill=True, stroke=False)


def generate_ticket_pdf(ticket, base_url: str = "") -> bytes:
    """Generate a PDF ticket styled with the Industrial Tech-Editorial design system.

    Returns the PDF content as bytes.
    """
    buf = io.BytesIO()
    width, height = A6  # 105mm x 148mm

    c = canvas.Canvas(buf, pagesize=A6)
    margin = 8 * mm

    # ── Level 0: Surface base ──
    c.setFillColor(SURFACE)
    c.rect(0, 0, width, height, fill=True, stroke=False)

    # ── Primary header block (monolithic, flush) ──
    header_h = 38 * mm
    c.setFillColor(PRIMARY)
    c.rect(0, height - header_h, width, header_h, fill=True, stroke=False)

    # Subtle gradient overlay (darker at top for depth)
    c.setFillColor(PRIMARY_DARK)
    c.rect(0, height - 8 * mm, width, 8 * mm, fill=True, stroke=False)

    # Brand name — large, industrial, flush-left
    c.setFillColor(ON_PRIMARY)
    c.setFont("Helvetica-Bold", 20)
    c.drawString(margin, height - 12 * mm, BRAND_NAME)

    # Tagline — label-md style, all-caps, technical metadata
    c.setFont("Helvetica", 6)
    c.setFillColor(PRIMARY_FIXED_DIM)
    c.drawString(margin, height - 16.5 * mm, BRAND_TAGLINE)

    # Draw title in header
    c.setFillColor(ON_PRIMARY)
    c.setFont("Helvetica-Bold", 8)
    c.drawString(margin, height - 26 * mm, "SORTEO HYPERCORE")
    c.setFont("Helvetica", 7)
    c.setFillColor(PRIMARY_FIXED_DIM)
    c.drawString(margin, height - 30.5 * mm, "Innovation MeetUp 2026 — Cancún")

    # ── Accent stripe (laser pointer) ──
    stripe_y = height - header_h - 3 * mm
    c.setFillColor(ACCENT)
    c.rect(0, stripe_y, width, 3 * mm, fill=True, stroke=False)

    # ── Folio section — the hero moment ──
    folio_y = stripe_y - 6 * mm

    # "FOLIO" label — engineering metadata style
    c.setFillColor(ON_SURFACE_MUTED)
    c.setFont("Helvetica", 6)
    c.drawString(margin, folio_y, "FOLIO")

    # Folio number — display-lg, monolithic
    folio_y -= 10 * mm
    c.setFillColor(PRIMARY)
    c.setFont("Helvetica-Bold", 32)
    c.drawString(margin, folio_y, ticket.folio)

    # ── Participant card (tonal layering: surface-container-low on surface) ──
    card_top = folio_y - 8 * mm
    card_h = 22 * mm
    card_x = margin
    card_w = width - (margin * 2)
    _draw_rounded_rect(c, card_x, card_top - card_h, card_w, card_h, 2 * mm, SURFACE_LOW)

    # "PARTICIPANTE" label
    c.setFillColor(ON_SURFACE_MUTED)
    c.setFont("Helvetica", 6)
    c.drawString(margin + 3 * mm, card_top - 5 * mm, "PARTICIPANTE")

    # Buyer name
    c.setFillColor(ON_SURFACE)
    c.setFont("Helvetica-Bold", 11)
    display_name = ticket.full_name
    if len(display_name) > 30:
        display_name = display_name[:27] + "..."
    c.drawString(margin + 3 * mm, card_top - 11 * mm, display_name)

    # Phone — subtle metadata
    c.setFillColor(ON_SURFACE_MUTED)
    c.setFont("Helvetica", 7)
    c.drawString(margin + 3 * mm, card_top - 17 * mm, ticket.phone)

    # ── Draw date chip (engineering metadata chip style) ──
    chip_y = card_top - card_h - 8 * mm
    chip_w = 42 * mm
    chip_h = 6 * mm
    _draw_rounded_rect(c, margin, chip_y, chip_w, chip_h, 1 * mm, PRIMARY_FIXED_DIM)

    c.setFillColor(PRIMARY_DARK)
    c.setFont("Helvetica-Bold", 6)
    c.drawString(margin + 2 * mm, chip_y + 2 * mm, f"SORTEO: {DRAW_DATE}")

    # NEW: QR Code Section
    if not base_url:
        from django.conf import settings
        base_url = getattr(settings, 'SITE_BASE_URL', 'http://localhost:5173')

    from .qr_utils import generate_qr_image
    qr_bytes = generate_qr_image(ticket.id, base_url)

    from reportlab.lib.utils import ImageReader
    qr_image = ImageReader(io.BytesIO(qr_bytes))

    qr_size = 22 * mm
    qr_x = width - margin - qr_size
    qr_y = 14 * mm
    c.drawImage(qr_image, qr_x, qr_y, width=qr_size, height=qr_size)

    c.setFillColor(ON_SURFACE_MUTED)
    c.setFont("Helvetica", 5)
    c.drawString(qr_x, qr_y - 3 * mm, "ESCANEA PARA VALIDAR")

    # ── Footer — minimal, editorial ──
    c.setFillColor(ON_SURFACE_MUTED)
    c.setFont("Helvetica", 5.5)
    c.drawString(margin, 10 * mm, "Este boleto es tu comprobante de participación.")
    c.setFont("Helvetica", 5)
    c.drawString(margin, 6.5 * mm, f"© {date.today().year} HyperCore — Universidad Tecmilenio")

    c.showPage()
    c.save()
    buf.seek(0)
    return buf.read()
