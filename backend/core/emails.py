import os
import resend
from django.conf import settings

# User needs to set this environment variable
resend.api_key = os.getenv("RESEND_API_KEY", "re_xxxxxxxxx")

def send_registration_email(user):
    try:
        resend.Emails.send({
            "from": "HyperCore <info@hypercoreqro.lat>",
            "to": [user.email],
            "subject": "¡Bienvenido a HyperCore Fundraiser!",
            "html": f"<p>Hola <strong>{user.first_name}</strong>,</p><p>Gracias por registrarte en nuestra plataforma de sorteos. Ahora puedes reservar tus boletos y gestionar tus tickets.</p><p>Saludos,<br/>El equipo de HyperCore</p>"
        })
    except Exception as e:
        print(f"Failed to send email via Resend: {e}")

def send_reservation_email(ticket):
    email = ticket.reserved_by.email if ticket.reserved_by else None
    if not email:
        return
        
    name = ticket.reserved_by.first_name if ticket.reserved_by else ticket.full_name
    try:
        resend.Emails.send({
            "from": "HyperCore <info@hypercoreqro.lat>",
            "to": [email],
            "subject": f"Boleto {ticket.folio} Reservado",
            "html": f"<p>Hola <strong>{name}</strong>,</p><p>Has reservado el boleto <strong>{ticket.folio}</strong>. Recuerda que tienes 24 horas para realizar el pago y enviar tu comprobante, de lo contrario tu reservación será liberada automáticamente.</p><p>Saludos,<br/>El equipo de HyperCore</p>"
        })
    except Exception as e:
        print(f"Failed to send email via Resend: {e}")

def send_validation_email(ticket):
    email = ticket.reserved_by.email if ticket.reserved_by else None
    if not email:
        return
        
    try:
        resend.Emails.send({
            "from": "HyperCore <info@hypercoreqro.lat>",
            "to": [email],
            "subject": f"Boleto {ticket.folio} Aprobado",
            "html": f"<p>Hola <strong>{ticket.full_name}</strong>,</p><p>Revisamos tu pago y el boleto <strong>{ticket.folio}</strong> ya está pagado y activo.</p><p>¡Mucha suerte en el sorteo!</p><p>Saludos,<br/>El equipo de HyperCore</p>"
        })
    except Exception as e:
        print(f"Failed to send email via Resend: {e}")

def send_profile_update_email(user):
    try:
        wa_link = "https://wa.me/5214421206701"
        resend.Emails.send({
            "from": "HyperCore <info@hypercoreqro.lat>",
            "to": [user.email],
            "subject": "Tu perfil de HyperCore ha sido actualizado",
            "html": f"""
                <p>Hola <strong>{user.first_name}</strong>,</p>
                <p>Te informamos que los datos de tu perfil en la plataforma HyperCore han sido modificados recientemente.</p>
                <p>Si tú realizaste estos cambios, puedes ignorar y borrar este correo tranquilamente.</p>
                <p><strong>¿No fuiste tú?</strong> Si no reconoces esta actividad, por favor contáctanos de inmediato a través de nuestro soporte técnico en WhatsApp: 
                <a href="{wa_link}">{wa_link}</a></p>
                <p>Saludos,<br/>El equipo de HyperCore</p>
            """
        })
    except Exception as e:
        print(f"Failed to send profile update email: {e}")

def send_draw_results_emails(winners, active_tickets):
    winner_ticket_ids = {w["ticket"].id for w in winners}
    winner_dict = {w["ticket"].id: w for w in winners}

    # Group tickets by email
    tickets_by_email = {}
    for ticket in active_tickets:
        email = ticket.reserved_by.email if ticket.reserved_by else None
        if not email:
            continue
        if email not in tickets_by_email:
            tickets_by_email[email] = []
        tickets_by_email[email].append(ticket)

    common_text = "<p>¡Te invitamos a revisar el sitio que seguiremos mostrando nuestro avance! Y que será cerrado un mes después, el 1 de junio.</p>"

    for email, tickets in tickets_by_email.items():
        user_winners = [t for t in tickets if t.id in winner_ticket_ids]
        user_losers = [t for t in tickets if t.id not in winner_ticket_ids]
        
        try:
            if user_winners:
                w_html = "".join([f"<li>Boleto <strong>{t.folio}</strong> - Premio: {winner_dict[t.id]['prize_name']}</li>" for t in user_winners])
                html_body = f"<p>Hola,</p><p>¡Felicidades! Has resultado ganador en el Sorteo HyperCore con los siguientes boletos:</p><ul>{w_html}</ul>{common_text}<p>Nos pondremos en contacto contigo para la entrega. Saludos,<br/>El equipo de HyperCore</p>"
                resend.Emails.send({
                    "from": "HyperCore <info@hypercoreqro.lat>",
                    "to": [email],
                    "subject": "¡Felicidades! Eres ganador del Sorteo HyperCore",
                    "html": html_body
                })
            else:
                html_body = f"<p>Hola,</p><p>Gracias por participar en el Sorteo HyperCore. Lamentablemente en esta ocasión tus boletos no resultaron ganadores.</p>{common_text}<p>Saludos,<br/>El equipo de HyperCore</p>"
                resend.Emails.send({
                    "from": "HyperCore <info@hypercoreqro.lat>",
                    "to": [email],
                    "subject": "Resultados del Sorteo HyperCore",
                    "html": html_body
                })
        except Exception as e:
            print(f"Failed to send draw results email: {e}")

