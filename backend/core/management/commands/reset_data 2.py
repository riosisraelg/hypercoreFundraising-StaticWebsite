"""Reset all tickets and draw results. Use with caution."""
from django.core.management.base import BaseCommand
from core.models import DrawResult, Ticket


class Command(BaseCommand):
    help = "Delete all tickets and draw results (reset to clean state)."

    def handle(self, *args, **options):
        dr_count = DrawResult.objects.all().delete()
        self.stdout.write(self.style.SUCCESS(f"DrawResults deleted: {dr_count}"))
        tk_count = Ticket.objects.all().delete()
        self.stdout.write(self.style.SUCCESS(f"Tickets deleted: {tk_count}"))
        self.stdout.write(self.style.SUCCESS("Done — database is clean."))
