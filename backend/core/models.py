import uuid
import re

from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.core.exceptions import ValidationError
from django.core.validators import MaxLengthValidator
from django.db import models


def validate_phone(value):
    """Validate phone number is non-empty and contains only digits, spaces, dashes, parens, or leading +."""
    if not value or not value.strip():
        raise ValidationError("Phone number is required.")
    pattern = r'^\+?[\d\s\-\(\)]{7,20}$'
    if not re.match(pattern, value.strip()):
        raise ValidationError("Invalid phone number format.")


class User(AbstractUser):
    @property
    def is_winner(self):
        return self.reserved_tickets.filter(draw_results__isnull=False).exists()


class Ticket(models.Model):
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pendiente'
        ACTIVE = 'active', 'Activado'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    folio = models.CharField(max_length=20, db_index=True)
    full_name = models.CharField(max_length=200, validators=[MaxLengthValidator(200)])
    phone = models.CharField(max_length=20, validators=[validate_phone])
    status = models.CharField(
        max_length=10,
        choices=Status.choices,
        default=Status.ACTIVE,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_tickets',
    )
    reserved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reserved_tickets',
    )
    expires_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['folio'],
                condition=models.Q(status__in=['active', 'pending']),
                name='unique_active_or_pending_folio',
            ),
        ]
        ordering = ['created_at']

    def __str__(self):
        return f"{self.folio} — {self.full_name} ({self.status})"

    def clean(self):
        super().clean()
        if not self.full_name or not self.full_name.strip():
            raise ValidationError({'full_name': 'Full name is required.'})
        if len(self.full_name) > 200:
            raise ValidationError({'full_name': 'Full name must not exceed 200 characters.'})


class DrawResult(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name='draw_results')
    prize_rank = models.PositiveSmallIntegerField()  # 1, 2, or 3
    prize_name = models.CharField(max_length=200)
    drawn_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['prize_rank']

    def __str__(self):
        return f"#{self.prize_rank} — {self.ticket.folio} ({self.prize_name})"

    def clean(self):
        super().clean()
        if self.prize_rank not in (1, 2, 3):
            raise ValidationError({'prize_rank': 'Prize rank must be 1, 2, or 3.'})


class FundraisingExtra(models.Model):
    """Tracks extra income from non-raffle sources (food sales, products, etc.).

    Only one record should exist — use get_or_create with id=1.
    """
    amount = models.PositiveIntegerField(default=0, help_text="Extra income in MXN")
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
    )

    def __str__(self):
        return f"Extra income: ${self.amount} MXN"


class Withdraw(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    amount = models.PositiveIntegerField(help_text="Withdraw amount in MXN")
    reason = models.CharField(max_length=255)
    withdrawn_at = models.DateTimeField(auto_now_add=True)
    withdrawn_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
    )

    class Meta:
        ordering = ['-withdrawn_at']

    def __str__(self):
        return f"Withdraw: ${self.amount} MXN by {self.withdrawn_by}"
