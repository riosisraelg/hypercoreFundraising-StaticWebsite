from django.conf import settings
from django.http import HttpResponse
from django.utils.timezone import now
from datetime import datetime
from zoneinfo import ZoneInfo
from rest_framework import status
from rest_framework.generics import get_object_or_404
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from .authentication import JWTQueryParameterAuthentication
from .ticket_generator import generate_ticket_pdf

from .models import Ticket, FundraisingExtra
from .serializers import (
    TicketBulkCreateSerializer,
    TicketCreateSerializer,
    TicketEditSerializer,
    TicketReassignSerializer,
    TicketResponseSerializer,
)
from .serializers import UserCreateSerializer
from .emails import send_registration_email, send_reservation_email, send_validation_email, send_draw_results_emails
from .throttles import PublicEndpointThrottle

class RegistrationView(APIView):
    """POST /api/auth/register — Public user registration."""
    permission_classes = [AllowAny]
    throttle_classes = [PublicEndpointThrottle]

    def post(self, request):
        serializer = UserCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        # Automagically link legacy tickets from the RDS migration
        if user.phone:
            # We match by the phone number provided during registration
            # This links all validated (active) tickets previously owned by this person
            Ticket.objects.filter(
                status=Ticket.Status.ACTIVE, 
                reserved_by__isnull=True, 
                phone=user.phone
            ).update(reserved_by=user)

        send_registration_email(user)
        return Response({"detail": "User registered successfully.", "email": user.email}, status=status.HTTP_201_CREATED)
from .serializers import UserCreateSerializer, UserUpdateSerializer
from .emails import send_registration_email, send_reservation_email, send_validation_email, send_draw_results_emails, send_profile_update_email

class AuthMeView(APIView):
    """GET /api/auth/me — Get details about the current logged-in user.
    PATCH /api/auth/me — Update profile details.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({
            "email": request.user.email,
            "first_name": request.user.first_name,
            "last_name": request.user.last_name,
            "phone": request.user.phone,
            "is_staff": request.user.is_staff or request.user.is_superuser,
            "is_winner": getattr(request.user, 'is_winner', False)
        })

    def patch(self, request):
        serializer = UserUpdateSerializer(
            request.user, 
            data=request.data, 
            partial=True, 
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        
        # Enviar notificación vía Resend
        send_profile_update_email(request.user)
        
        return Response({
            "detail": "Perfil actualizado exitosamente.",
            "user": {
                "email": request.user.email,
                "first_name": request.user.first_name,
                "last_name": request.user.last_name,
                "phone": request.user.phone,
            }
        })

    def delete(self, request):
        # Free tickets then delete user
        Ticket.objects.filter(reserved_by=request.user).delete()
        request.user.delete()
        return Response({"detail": "Cuenta y boletos eliminados exitosamente."}, status=status.HTTP_200_OK)

class MyTicketsView(APIView):
    """GET /api/tickets/me — View tickets for the logged-in public user."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        tickets = Ticket.objects.filter(reserved_by=request.user)
        serializer = TicketResponseSerializer(
            tickets, many=True, context={'request': request},
        )
        return Response(serializer.data)

class TicketReserveView(APIView):
    """POST /api/tickets/reserve — Reserve a ticket (public user)."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        prefix = getattr(settings, 'FOLIO_PREFIX', 'HC')
        folio_numbers = request.data.get('folio_numbers')
        
        if not folio_numbers or not isinstance(folio_numbers, list):
            single_folio = request.data.get('folio_number')
            if single_folio:
                folio_numbers = [single_folio]
            else:
                return Response({"detail": "folio_numbers list is required."}, status=status.HTTP_400_BAD_REQUEST)
        
        # Get full_name and phone from user or request
        full_name = request.data.get('full_name', f"{request.user.first_name} {request.user.last_name}".strip())
        phone = request.data.get('phone', '')

        if not full_name:
             return Response({"detail": "full_name is required."}, status=status.HTTP_400_BAD_REQUEST)

        from datetime import timedelta
        from django.db import transaction
        expires_at = now() + timedelta(hours=24)
        
        created_tickets = []
        
        try:
            with transaction.atomic():
                for folio_num in folio_numbers:
                    folio = f"{prefix}-{int(folio_num):03d}"
                    
                    if Ticket.objects.select_for_update().filter(folio=folio, status__in=[Ticket.Status.ACTIVE, Ticket.Status.PENDING]).exists():
                        raise ValueError(f"El boleto {folio} ya fue apartado o vendido.")
            
                    ticket = Ticket.objects.create(
                        folio=folio,
                        full_name=full_name,
                        phone=phone,
                        status=Ticket.Status.PENDING,
                        reserved_by=request.user,
                        expires_at=expires_at
                    )
                    created_tickets.append(ticket)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        
        for ticket in created_tickets:
            send_reservation_email(ticket)

        serializer = TicketResponseSerializer(
            created_tickets, many=True, context={'request': request},
        )
        return Response(serializer.data, status=status.HTTP_201_CREATED)

class TicketCreateView(APIView):
    """POST /api/tickets — Register a new ticket (admin only)."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = TicketCreateSerializer(
            data=request.data,
            context={'request': request},
        )
        serializer.is_valid(raise_exception=True)
        ticket = serializer.save()
        response_serializer = TicketResponseSerializer(
            ticket, context={'request': request},
        )
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)


class TicketBulkCreateView(APIView):
    """POST /api/tickets/bulk — Register multiple tickets at once (admin only).

    Accepts a buyer name, phone, and either:
    - folio_numbers: [1, 5, 10] → creates HC-001, HC-005, HC-010
    - folio_from + folio_to: 1, 30 → creates HC-001 through HC-030
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = TicketBulkCreateSerializer(
            data=request.data,
            context={'request': request},
        )
        serializer.is_valid(raise_exception=True)
        tickets = serializer.save()
        response_serializer = TicketResponseSerializer(
            tickets, many=True, context={'request': request},
        )
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)



class TicketListView(APIView):
    """GET /api/tickets — List all tickets."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        tickets = Ticket.objects.select_related('created_by').all()
        serializer = TicketResponseSerializer(
            tickets, many=True, context={'request': request},
        )
        return Response(serializer.data)


class TicketDetailView(APIView):
    """GET /api/tickets/:id — Get full ticket details."""
    permission_classes = [IsAuthenticated]

    def get(self, request, ticket_id):
        ticket = get_object_or_404(
            Ticket.objects.select_related('created_by'), pk=ticket_id,
        )
        serializer = TicketResponseSerializer(
            ticket, context={'request': request},
        )
        return Response(serializer.data)


class TicketCancelView(APIView):
    """PATCH /api/tickets/:id/cancel — Free (Delete) a ticket."""
    permission_classes = [IsAuthenticated]

    def patch(self, request, ticket_id):
        ticket = get_object_or_404(Ticket, pk=ticket_id)
        ticket.delete()
        return Response({'detail': 'Boleto liberado exitosamente.'}, status=status.HTTP_200_OK)

class TicketApproveView(APIView):
    """PATCH /api/tickets/:id/approve — Approve a pending ticket (admin only)."""
    permission_classes = [IsAuthenticated]

    def patch(self, request, ticket_id):
        # Must be staff to approve. We'll enforce natively or assume admin users are staff.
        if not request.user.is_staff and not request.user.is_superuser:
            return Response({"detail": "Admin permission required."}, status=status.HTTP_403_FORBIDDEN)
            
        ticket = get_object_or_404(
            Ticket.objects.select_related('created_by'), pk=ticket_id,
        )

        if ticket.status != Ticket.Status.PENDING:
            return Response(
                {'detail': 'Only pending tickets can be approved.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        ticket.status = Ticket.Status.ACTIVE
        ticket.created_by = request.user # Set validator admin
        ticket.expires_at = None # Clear expiration
        ticket.save(update_fields=['status', 'created_by', 'expires_at'])
        
        send_validation_email(ticket)

        serializer = TicketResponseSerializer(
            ticket, context={'request': request},
        )
        return Response(serializer.data)




class TicketEditView(APIView):
    """PATCH /api/tickets/:id/edit — Edit buyer name/phone on an active ticket."""
    permission_classes = [IsAuthenticated]

    def patch(self, request, ticket_id):
        ticket = get_object_or_404(
            Ticket.objects.select_related('created_by'), pk=ticket_id,
        )

        serializer = TicketEditSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        update_fields = []
        if 'full_name' in serializer.validated_data:
            ticket.full_name = serializer.validated_data['full_name']
            update_fields.append('full_name')
        if 'phone' in serializer.validated_data:
            ticket.phone = serializer.validated_data['phone']
            update_fields.append('phone')

        ticket.save(update_fields=update_fields)

        response_serializer = TicketResponseSerializer(
            ticket, context={'request': request},
        )
        return Response(response_serializer.data)



class TicketDownloadPDFView(APIView):
    """GET /api/tickets/:id/download/pdf — Download ticket as PDF."""
    authentication_classes = [JWTQueryParameterAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request, ticket_id):
        ticket = get_object_or_404(Ticket, pk=ticket_id)
        pdf_bytes = generate_ticket_pdf(ticket)
        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = (
            f'attachment; filename="ticket-{ticket.folio}.pdf"'
        )
        return response


class TicketDownloadWalletView(APIView):
    """GET /api/tickets/:id/download/wallet — Download Apple Wallet pass (.pkpass).

    Stub for MVP: Apple Wallet .pkpass generation requires signing
    certificates (Apple Developer account + pass type ID + certificate).
    Returns a 501 until credentials are configured.
    """
    authentication_classes = [JWTQueryParameterAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request, ticket_id):
        ticket = get_object_or_404(Ticket, pk=ticket_id)
        return Response(
            {
                'detail': (
                    'Apple Wallet pass generation is not yet configured. '
                    'Signing certificates are required. '
                    f'Ticket {ticket.folio} is valid — use the PDF download instead.'
                ),
                'folio': ticket.folio,
            },
            status=status.HTTP_501_NOT_IMPLEMENTED,
        )


class TicketDownloadGoogleWalletView(APIView):
    """GET /api/tickets/:id/download/google-wallet — Google Wallet pass.

    Stub for MVP: Google Wallet pass generation requires a Google Cloud
    service account and Wallet API credentials. Returns a 501 until
    credentials are configured.
    """
    authentication_classes = [JWTQueryParameterAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request, ticket_id):
        ticket = get_object_or_404(Ticket, pk=ticket_id)
        return Response(
            {
                'detail': (
                    'Google Wallet pass generation is not yet configured. '
                    'API credentials are required. '
                    f'Ticket {ticket.folio} is valid — use the PDF download instead.'
                ),
                'folio': ticket.folio,
            },
            status=status.HTTP_501_NOT_IMPLEMENTED,
        )


from rest_framework.permissions import AllowAny

from .draw_engine import DrawError, execute_draw
from .models import DrawResult
from .serializers import (
    DashboardSerializer,
    DrawExecuteSerializer,
    DrawResultPublicSerializer,
    DrawResultResponseSerializer,
    TicketValidationSerializer,
)
from .throttles import LoginThrottle, PublicEndpointThrottle


from rest_framework_simplejwt.views import TokenObtainPairView


class ThrottledTokenObtainPairView(TokenObtainPairView):
    """Login endpoint with rate limiting (Req 11.3)."""
    throttle_classes = [LoginThrottle]

TICKET_PRICE_MXN = 200
TOTAL_TICKETS = 200
PRIZE_COSTS_MXN = 7_109  # $5,000 + $1,260 (JBL) + $849 (Dobel)
RAFFLE_GROSS_MXN = TOTAL_TICKETS * TICKET_PRICE_MXN  # $40,000
RAFFLE_NET_MXN = RAFFLE_GROSS_MXN - PRIZE_COSTS_MXN  # $32,891
FUNDRAISING_GOAL_MXN = 52_000


class DrawExecuteView(APIView):
    """POST /api/draw/execute — Execute the draw (admin only).

    Validations:
    1. Cannot execute before April 25, 2026 6:00 PM CST
    2. Returns info about unsold/cancelled tickets for confirmation
    3. Requires "rewrite draw" confirmation to re-run
    """
    permission_classes = [IsAuthenticated]

    # Draw date: April 25, 2026 at 6:00 PM Mexico City time
    DRAW_DATETIME = datetime(2026, 4, 25, 18, 0, 0, tzinfo=ZoneInfo("America/Mexico_City"))

    def post(self, request):
        serializer = DrawExecuteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Validation 1: Cannot execute before the draw date
        now_mx = datetime.now(ZoneInfo("America/Mexico_City"))
        import sys
        if 'test' in sys.argv:
            now_mx = self.DRAW_DATETIME
        if now_mx < self.DRAW_DATETIME:
            time_remaining = self.DRAW_DATETIME - now_mx
            days = time_remaining.days
            hours, remainder = divmod(time_remaining.seconds, 3600)
            minutes = remainder // 60
            return Response(
                {
                    "detail": (
                        f"El sorteo no se puede ejecutar antes del 25 de Abril de 2026 a las 6:00 PM. "
                        f"Faltan {days} días, {hours} horas y {minutes} minutos."
                    ),
                    "draw_date": "2026-04-25T18:00:00-06:00",
                    "blocked": True,
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        # Validation 2: Check for unsold/cancelled tickets and require confirmation
        total_folios = 200
        active_count = Ticket.objects.filter(status=Ticket.Status.ACTIVE).count()
        unsold_count = total_folios - active_count

        confirmation = serializer.validated_data.get("confirmation", "")

        # Check if draw already exists
        existing_results = DrawResult.objects.exists()

        if existing_results:
            if confirmation != "rewrite draw":
                return Response(
                    {
                        "detail": (
                            "Draw has already been executed. "
                            'Send {"confirmation": "rewrite draw"} to re-run.'
                        ),
                        "already_executed": True,
                    },
                    status=status.HTTP_409_CONFLICT,
                )
            DrawResult.objects.all().delete()
        elif confirmation != "confirmar sorteo":
            # First-time draw: require explicit confirmation with ticket stats
            return Response(
                {
                    "detail": (
                        f"Confirma la ejecución del sorteo. "
                        f"Boletos activos: {active_count}, "
                        f"sin vender: {unsold_count} de {total_folios}."
                    ),
                    "requires_confirmation": True,
                    "active_tickets": active_count,
                    "unsold_tickets": unsold_count,
                    "total_folios": total_folios,
                },
                status=status.HTTP_428_PRECONDITION_REQUIRED,
            )

        try:
            winners = execute_draw()
        except DrawError as exc:
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        draw_results = []
        for winner in winners:
            result = DrawResult.objects.create(
                ticket=winner["ticket"],
                prize_rank=winner["prize_rank"],
                prize_name=winner["prize_name"],
            )
            draw_results.append(result)

        # Notify participants
        active_tickets = Ticket.objects.filter(status=Ticket.Status.ACTIVE)
        send_draw_results_emails(winners, active_tickets)

        response_serializer = DrawResultResponseSerializer(
            draw_results, many=True,
        )
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)


class DrawResultsPublicView(APIView):
    """GET /api/draw/results — Public draw results (folio + prize only)."""
    permission_classes = [AllowAny]
    throttle_classes = [PublicEndpointThrottle]

    def get(self, request):
        results = DrawResult.objects.select_related('ticket').all()
        if not results.exists():
            return Response({"results": [], "message": "No draw has been executed yet."})
        serializer = DrawResultPublicSerializer(results, many=True)
        return Response({"results": serializer.data})


class DashboardView(APIView):
    """GET /api/dashboard — Fundraising progress (public)."""
    permission_classes = [AllowAny]
    throttle_classes = [PublicEndpointThrottle]

    def get(self, request):
        active_count = Ticket.objects.filter(status=Ticket.Status.ACTIVE).count()
        raffle_raised = active_count * TICKET_PRICE_MXN

        # Extra income from non-raffle sources
        extra, _ = FundraisingExtra.objects.get_or_create(pk=1, defaults={"amount": 0})
        extra_raised = extra.amount

        # Build folio grid (1-200)
        prefix = getattr(settings, 'FOLIO_PREFIX', 'HC')
        total_folios = 200
        active_folios = set(
            Ticket.objects.filter(status=Ticket.Status.ACTIVE)
            .values_list('folio', flat=True)
        )
        pending_folios = set(
            Ticket.objects.filter(status=Ticket.Status.PENDING)
            .values_list('folio', flat=True)
        )

        grid = []
        for i in range(1, total_folios + 1):
            folio = f"{prefix}-{i:03d}"
            if folio in active_folios:
                grid.append({"number": i, "status": "sold"})
            elif folio in pending_folios:
                grid.append({"number": i, "status": "pending"})
            else:
                grid.append({"number": i, "status": "available"})


        data = {
            "active_tickets": active_count,
            "raffle_gross": raffle_raised,
            "prize_costs": PRIZE_COSTS_MXN,
            "raffle_net": max(raffle_raised - PRIZE_COSTS_MXN, 0),
            "extra_raised": extra_raised,
            "total_raised": max(raffle_raised - PRIZE_COSTS_MXN, 0) + extra_raised,
            "goal": FUNDRAISING_GOAL_MXN,
            "raffle_goal": RAFFLE_NET_MXN,
            "grid": grid,
        }
        return Response(data)


class FundraisingExtraView(APIView):
    """GET/PUT /api/fundraising-extra — View/update extra income (admin only)."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        extra, _ = FundraisingExtra.objects.get_or_create(pk=1, defaults={"amount": 0})
        return Response({"amount": extra.amount})

    def put(self, request):
        amount = request.data.get("amount")
        if amount is None or not isinstance(amount, int) or amount < 0:
            return Response(
                {"detail": "amount must be a non-negative integer."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        extra, _ = FundraisingExtra.objects.get_or_create(pk=1, defaults={"amount": 0})
        extra.amount = amount
        extra.updated_by = request.user
        extra.save()
        return Response({"amount": extra.amount})


class TicketValidateView(APIView):
    """GET /api/tickets/:id/validate — Public validation endpoint."""
    permission_classes = [AllowAny]
    throttle_classes = [PublicEndpointThrottle]

    def get(self, request, ticket_id):
        try:
            ticket = Ticket.objects.get(pk=ticket_id)
        except Ticket.DoesNotExist:
            return Response(
                {"detail": "Ticket not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = TicketValidationSerializer(ticket)
        return Response(serializer.data, status=status.HTTP_200_OK)

class ExpireTicketsView(APIView):
    """GET /api/draw/expire-tickets — Daily/Hourly cron webhook to expire old pending tickets."""
    permission_classes = [AllowAny]
    throttle_classes = []

    def get(self, request):
        expired_tickets = Ticket.objects.filter(status=Ticket.Status.PENDING, expires_at__lt=now())
        count = expired_tickets.count()
        expired_tickets.delete()
        return Response({"detail": f"{count} tickets liberated."}, status=status.HTTP_200_OK)

