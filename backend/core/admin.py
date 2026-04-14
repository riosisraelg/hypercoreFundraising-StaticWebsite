from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import Ticket, DrawResult, Withdraw, User

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    pass



@admin.register(Ticket)
class TicketAdmin(admin.ModelAdmin):
    list_display = ('folio', 'full_name', 'phone', 'status', 'created_at')
    list_filter = ('status',)
    search_fields = ('folio', 'full_name', 'phone')
    readonly_fields = ('id', 'created_at')


@admin.register(DrawResult)
class DrawResultAdmin(admin.ModelAdmin):
    list_display = ('ticket', 'prize_rank', 'prize_name', 'drawn_at')
    readonly_fields = ('id', 'drawn_at')


@admin.register(Withdraw)
class WithdrawAdmin(admin.ModelAdmin):
    list_display = ('amount', 'reason', 'withdrawn_by', 'withdrawn_at')
    readonly_fields = ('id', 'withdrawn_at')

