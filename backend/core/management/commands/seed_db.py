from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from core.models import Ticket, DrawResult, FundraisingExtra
from django.utils import timezone
from datetime import timedelta

User = get_user_model()

class Command(BaseCommand):
    help = 'Seeds the database with test data for tickets and users.'

    def handle(self, *args, **kwargs):
        self.stdout.write("Clearing old data...")
        Ticket.objects.all().delete()
        DrawResult.objects.all().delete()
        User.objects.exclude(is_superuser=True).delete()

        # Ensure we have an admin
        admin_user, created = User.objects.get_or_create(
            username='admin@hypercore.com',
            defaults={
                'email': 'admin@hypercore.com',
                'first_name': 'Super',
                'last_name': 'Admin',
                'is_staff': True,
                'is_superuser': True
            }
        )
        if created:
            admin_user.set_password('admin123')
            admin_user.save()
            self.stdout.write(self.style.SUCCESS("Created admin user: admin@hypercore.com / admin123"))

        # Public tests user
        test_user, created = User.objects.get_or_create(
            username='user@hypercore.com',
            defaults={
                'email': 'user@hypercore.com',
                'first_name': 'Juan',
                'last_name': 'Perez',
                'is_staff': False,
                'is_superuser': False
            }
        )
        if created:
            test_user.set_password('user123')
            test_user.save()
            self.stdout.write(self.style.SUCCESS("Created test user: user@hypercore.com / user123"))
        
        # Test user 2
        test_user2, created = User.objects.get_or_create(
            username='maria@hypercore.com',
            defaults={
                'email': 'maria@hypercore.com',
                'first_name': 'Maria',
                'last_name': 'Gomez',
                'is_staff': False,
                'is_superuser': False
            }
        )
        if created:
            test_user2.set_password('user123')
            test_user2.save()

        self.stdout.write("Generating Tickets...")

        # Case 1: Manual tickets registered by Admin directly (Status Active, no assigned User)
        for i in range(1, 11):
            Ticket.objects.create(
                folio=f"HC-{i:03d}",
                full_name=f"Comprador Manual {i}",
                phone="4421234567",
                status=Ticket.Status.ACTIVE,
                created_by=admin_user,
                reserved_by=None
            )

        # Case 2: Active tickets bought by public users (Approved by Admin)
        for i in range(11, 21):
            Ticket.objects.create(
                folio=f"HC-{i:03d}",
                full_name=f"{test_user.first_name} {test_user.last_name}",
                phone="4427654321",
                status=Ticket.Status.ACTIVE,
                created_by=admin_user, # Admin validated it
                reserved_by=test_user
            )

        # Case 3: Pending tickets reserved by another user
        one_day_from_now = timezone.now() + timedelta(days=1)
        for i in range(21, 31):
            Ticket.objects.create(
                folio=f"HC-{i:03d}",
                full_name=f"{test_user2.first_name} {test_user2.last_name}",
                phone="4428889999",
                status=Ticket.Status.PENDING,
                created_by=None, 
                reserved_by=test_user2,
                expires_at=one_day_from_now
            )

        # Setting some extra income to test dashboard metrics
        extra, _ = FundraisingExtra.objects.get_or_create(pk=1)
        extra.amount = 1500
        extra.save()
        
        self.stdout.write(self.style.SUCCESS("Database seeded successfully!"))
        self.stdout.write("-> 10 Boletos Activos (Manuales)")
        self.stdout.write("-> 10 Boletos Activos (Public User)")
        self.stdout.write("-> 10 Boletos Pendientes (Public User 2)")
        self.stdout.write("-> Extra Income: $1500")
        
