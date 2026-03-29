from django.conf import settings
from django.db import models as db_models
from rest_framework import serializers

from .models import Ticket


class TicketCreateSerializer(serializers.Serializer):
    """Validates input for ticket creation."""
    full_name = serializers.CharField(max_length=200)
    phone = serializers.CharField(max_length=20)

    def validate_full_name(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Full name is required.")
        return value.strip()

    def validate_phone(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Phone number is required.")
        import re
        pattern = r'^\+?[\d\s\-\(\)]{7,20}$'
        if not re.match(pattern, value.strip()):
            raise serializers.ValidationError("Invalid phone number format.")
        return value.strip()

    def create(self, validated_data):
        folio = self._generate_folio()
        ticket = Ticket.objects.create(
            folio=folio,
            full_name=validated_data['full_name'],
            phone=validated_data['phone'],
            status=Ticket.Status.ACTIVE,
            created_by=self.context['request'].user,
        )
        return ticket

    def _generate_folio(self):
        """Auto-generate the next sequential folio like HC-001, HC-002, etc."""
        prefix = getattr(settings, 'FOLIO_PREFIX', 'HC')
        last_ticket = (
            Ticket.objects.filter(folio__startswith=f"{prefix}-")
            .order_by('-folio')
            .values_list('folio', flat=True)
            .first()
        )
        if last_ticket:
            try:
                last_num = int(last_ticket.split('-')[-1])
            except (ValueError, IndexError):
                last_num = 0
        else:
            last_num = 0
        return f"{prefix}-{last_num + 1:03d}"


class TicketReassignSerializer(serializers.Serializer):
    """Validates input for folio reassignment on a cancelled ticket."""
    full_name = serializers.CharField(max_length=200)
    phone = serializers.CharField(max_length=20)

    def validate_full_name(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Full name is required.")
        return value.strip()

    def validate_phone(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Phone number is required.")
        import re
        pattern = r'^\+?[\d\s\-\(\)]{7,20}$'
        if not re.match(pattern, value.strip()):
            raise serializers.ValidationError("Invalid phone number format.")
        return value.strip()


class TicketResponseSerializer(serializers.ModelSerializer):
    """Serializes ticket data for API responses."""
    created_by_username = serializers.CharField(
        source='created_by.username', read_only=True, default=None,
    )
    download_links = serializers.SerializerMethodField()

    class Meta:
        model = Ticket
        fields = [
            'id', 'folio', 'full_name', 'phone', 'status',
            'created_at', 'cancelled_at', 'created_by_username',
            'download_links',
        ]

    def get_download_links(self, obj):
        request = self.context.get('request')
        base = ''
        if request:
            base = request.build_absolute_uri('/')[:-1]  # strip trailing slash
        return {
            'pdf': f"{base}/api/tickets/{obj.id}/download/pdf",
            'wallet': f"{base}/api/tickets/{obj.id}/download/wallet",
            'google_wallet': f"{base}/api/tickets/{obj.id}/download/google-wallet",
        }


from .models import DrawResult


class DrawExecuteSerializer(serializers.Serializer):
    """Validates input for draw execution (optional confirmation phrase)."""
    confirmation = serializers.CharField(
        required=False, default="", max_length=50, allow_blank=True,
    )

    def validate_confirmation(self, value):
        if value and value.strip():
            value = value.strip()
            if value != "rewrite draw":
                raise serializers.ValidationError(
                    'Confirmation must be exactly "rewrite draw" or empty.'
                )
        return value.strip() if value else ""


class DrawResultResponseSerializer(serializers.ModelSerializer):
    """Serializes draw results for admin responses (includes winner details)."""
    folio = serializers.CharField(source='ticket.folio', read_only=True)
    full_name = serializers.CharField(source='ticket.full_name', read_only=True)
    phone = serializers.CharField(source='ticket.phone', read_only=True)

    class Meta:
        model = DrawResult
        fields = ['id', 'folio', 'full_name', 'phone', 'prize_rank', 'prize_name', 'drawn_at']


class DrawResultPublicSerializer(serializers.ModelSerializer):
    """Serializes draw results for public responses (folio + prize only, no PII)."""
    folio = serializers.CharField(source='ticket.folio', read_only=True)

    class Meta:
        model = DrawResult
        fields = ['folio', 'prize_rank', 'prize_name']


class DashboardSerializer(serializers.Serializer):
    """Serializes dashboard data."""
    active_tickets = serializers.IntegerField()
    total_raised = serializers.IntegerField()
    goal = serializers.IntegerField()
