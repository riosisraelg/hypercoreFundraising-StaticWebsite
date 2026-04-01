from django.conf import settings
from django.db import models as db_models
from rest_framework import serializers

from .models import Ticket


class TicketCreateSerializer(serializers.Serializer):
    """Validates input for ticket creation.

    The `folio_number` field is optional. When provided, the folio is
    built as ``{PREFIX}-{number:03d}`` (e.g. 50 → HC-050). When omitted
    or blank, the next sequential folio is auto-generated.
    """
    full_name = serializers.CharField(max_length=200)
    phone = serializers.CharField(max_length=20)
    folio_number = serializers.IntegerField(
        required=False, allow_null=True, min_value=1, max_value=999,
    )

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

    def validate_folio_number(self, value):
        if value is None:
            return None
        prefix = getattr(settings, 'FOLIO_PREFIX', 'HC')
        desired_folio = f"{prefix}-{value:03d}"
        if Ticket.objects.filter(folio=desired_folio, status=Ticket.Status.ACTIVE).exists():
            raise serializers.ValidationError(
                f"El folio {desired_folio} ya está asignado a un boleto activo."
            )
        return value

    def create(self, validated_data):
        folio_number = validated_data.pop('folio_number', None)
        if folio_number is not None:
            prefix = getattr(settings, 'FOLIO_PREFIX', 'HC')
            folio = f"{prefix}-{folio_number:03d}"
        else:
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


class TicketBulkCreateSerializer(serializers.Serializer):
    """Validates input for bulk ticket creation.

    Accepts a buyer name, phone, and either a list of specific folio numbers
    or a range (folio_from / folio_to). All created tickets share the same buyer.
    """
    full_name = serializers.CharField(max_length=200)
    phone = serializers.CharField(max_length=20)
    folio_numbers = serializers.ListField(
        child=serializers.IntegerField(min_value=1, max_value=999),
        required=False, allow_empty=True, max_length=200,
    )
    folio_from = serializers.IntegerField(required=False, min_value=1, max_value=999)
    folio_to = serializers.IntegerField(required=False, min_value=1, max_value=999)

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

    def validate(self, data):
        has_list = bool(data.get('folio_numbers'))
        has_range = 'folio_from' in data and 'folio_to' in data
        if not has_list and not has_range:
            raise serializers.ValidationError(
                "Provide either folio_numbers or folio_from/folio_to."
            )
        if has_list and has_range:
            raise serializers.ValidationError(
                "Provide folio_numbers or folio_from/folio_to, not both."
            )
        if has_range:
            if data['folio_from'] > data['folio_to']:
                raise serializers.ValidationError(
                    "folio_from must be <= folio_to."
                )
            count = data['folio_to'] - data['folio_from'] + 1
            if count > 200:
                raise serializers.ValidationError(
                    "Cannot create more than 200 tickets at once."
                )
            data['folio_numbers'] = list(
                range(data['folio_from'], data['folio_to'] + 1)
            )
        # Check for conflicts
        prefix = getattr(settings, 'FOLIO_PREFIX', 'HC')
        conflicts = []
        for num in data['folio_numbers']:
            folio = f"{prefix}-{num:03d}"
            if Ticket.objects.filter(folio=folio, status=Ticket.Status.ACTIVE).exists():
                conflicts.append(folio)
        if conflicts:
            raise serializers.ValidationError(
                f"Folios ya activos: {', '.join(conflicts)}"
            )
        return data

    def create(self, validated_data):
        prefix = getattr(settings, 'FOLIO_PREFIX', 'HC')
        user = self.context['request'].user
        tickets = []
        for num in validated_data['folio_numbers']:
            tickets.append(Ticket(
                folio=f"{prefix}-{num:03d}",
                full_name=validated_data['full_name'],
                phone=validated_data['phone'],
                status=Ticket.Status.ACTIVE,
                created_by=user,
            ))
        return Ticket.objects.bulk_create(tickets)


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


class TicketEditSerializer(serializers.Serializer):
    """Validates input for editing ticket buyer info (name/phone)."""
    full_name = serializers.CharField(max_length=200, required=False)
    phone = serializers.CharField(max_length=20, required=False)

    def validate_full_name(self, value):
        if value is not None and not value.strip():
            raise serializers.ValidationError("Full name cannot be blank.")
        return value.strip() if value else value

    def validate_phone(self, value):
        if value is not None and not value.strip():
            raise serializers.ValidationError("Phone cannot be blank.")
        if value:
            import re
            pattern = r'^\+?[\d\s\-\(\)]{7,20}$'
            if not re.match(pattern, value.strip()):
                raise serializers.ValidationError("Invalid phone number format.")
        return value.strip() if value else value

    def validate(self, data):
        if not data.get('full_name') and not data.get('phone'):
            raise serializers.ValidationError("Provide at least full_name or phone to update.")
        return data


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


class TicketValidationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ticket
        fields = ['id', 'folio', 'status', 'full_name']

