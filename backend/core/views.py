from django.conf import settings
from django.http import HttpResponse
from django.utils.timezone import now
from rest_framework import status
from rest_framework.generics import get_object_or_404
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Ticket, FundraisingExtra
from .serializers import (
    TicketBulkCreateSerializer,
    TicketCreateSerializer,
    TicketReassignSerializer,
    TicketResponseSerializer,
)
from .ticket_generator import generate_ticket_pdf


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
    """GET /api/tickets — List all tickets (active + cancelled)."""
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
    """PATCH /api/tickets/:id/cancel — Cancel an active ticket."""
    permission_classes = [IsAuthenticated]

    def patch(self, request, ticket_id):
        ticket = get_object_or_404(
            Ticket.objects.select_related('created_by'), pk=ticket_id,
        )

        if ticket.status == Ticket.Status.CANCELLED:
            return Response(
                {'detail': 'Ticket is already cancelled.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        ticket.status = Ticket.Status.CANCELLED
        ticket.cancelled_at = now()
        ticket.save(update_fields=['status', 'cancelled_at'])

        serializer = TicketResponseSerializer(
            ticket, context={'request': request},
        )
        return Response(serializer.data)


class TicketReassignView(APIView):
    """POST /api/tickets/:id/reassign — Reassign a cancelled folio to a new buyer."""
    permission_classes = [IsAuthenticated]

    def post(self, request, ticket_id):
        original_ticket = get_object_or_404(
            Ticket.objects.select_related('created_by'), pk=ticket_id,
        )

        # Only cancelled tickets can have their folio reassigned
        if original_ticket.status == Ticket.Status.ACTIVE:
            return Response(
                {'detail': 'Cannot reassign an active folio. Cancel the ticket first.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate new buyer data
        serializer = TicketReassignSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Double-check no active ticket already holds this folio (DB constraint also enforces this)
        if Ticket.objects.filter(folio=original_ticket.folio, status=Ticket.Status.ACTIVE).exists():
            return Response(
                {'detail': 'This folio is already assigned to an active ticket.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Create a new active ticket reusing the folio
        new_ticket = Ticket.objects.create(
            folio=original_ticket.folio,
            full_name=serializer.validated_data['full_name'],
            phone=serializer.validated_data['phone'],
            status=Ticket.Status.ACTIVE,
            created_by=request.user,
        )

        response_serializer = TicketResponseSerializer(
            new_ticket, context={'request': request},
        )
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)



class TicketDownloadPDFView(APIView):
    """GET /api/tickets/:id/download/pdf — Download ticket as PDF."""
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
    """POST /api/draw/execute — Execute the draw (admin only)."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = DrawExecuteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        existing_results = DrawResult.objects.exists()

        if existing_results:
            confirmation = serializer.validated_data.get("confirmation", "")
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
            # Delete previous results before re-running
            DrawResult.objects.all().delete()

        try:
            winners = execute_draw()
        except DrawError as exc:
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Store DrawResult records
        draw_results = []
        for winner in winners:
            result = DrawResult.objects.create(
                ticket=winner["ticket"],
                prize_rank=winner["prize_rank"],
                prize_name=winner["prize_name"],
            )
            draw_results.append(result)

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
        cancelled_folios = set(
            Ticket.objects.filter(status=Ticket.Status.CANCELLED)
            .values_list('folio', flat=True)
        ) - active_folios

        grid = []
        for i in range(1, total_folios + 1):
            folio = f"{prefix}-{i:03d}"
            if folio in active_folios:
                grid.append({"number": i, "status": "sold"})
            elif folio in cancelled_folios:
                grid.append({"number": i, "status": "cancelled"})
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
