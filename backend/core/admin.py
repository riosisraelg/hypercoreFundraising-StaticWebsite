from django.contrib import admin
from .models import Ticket, DrawResult


@admin.register(Ticket)
class TicketAdmin(admin.ModelAdmin):
    list_display = ('folio', 'full_name', 'phone', 'status', 'created_at', 'cancelled_at')
    list_filter = ('status',)
    search_fields = ('folio', 'full_name', 'phone')
    readonly_fields = ('id', 'created_at')


@admin.register(DrawResult)
class DrawResultAdmin(admin.ModelAdmin):
    list_display = ('ticket', 'prize_rank', 'prize_name', 'drawn_at')
    readonly_fields = ('id', 'drawn_at')
