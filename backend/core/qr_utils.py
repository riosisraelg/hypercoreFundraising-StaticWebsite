import io
import uuid
import qrcode
from qrcode.constants import ERROR_CORRECT_M

def generate_qr_image(ticket_id: uuid.UUID, base_url: str) -> bytes:
    """Generate a QR code PNG encoding the validation URL."""
    validation_url = f"{base_url}/api/tickets/{ticket_id}/validate"
    qr = qrcode.QRCode(
        version=None,
        error_correction=ERROR_CORRECT_M,
        box_size=10,
        border=2,
    )
    qr.add_data(validation_url)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return buf.read()
