"""
Management command to create initial admin users for Team HyperCore.

Usage:
    python manage.py create_initial_admins
    python manage.py create_initial_admins --password mysecretpass
"""

from core.models import User
from django.core.management.base import BaseCommand


# Team HyperCore members — initial admin accounts
INITIAL_ADMINS = [
    {
        "username": "israel",
        "first_name": "Fernando Israel",
        "last_name": "Rios Garcia",
    },
    {
        "username": "mariana",
        "first_name": "Mariana",
        "last_name": "Lopez Garcia",
    },
    {
        "username": "diego",
        "first_name": "Diego Santiago",
        "last_name": "Saucedo García",
    },
    {
        "username": "ana",
        "first_name": "Ana Sarai",
        "last_name": "Zuñiga Esquivel",
    },
    {
        "username": "natalie",
        "first_name": "Natalie",
        "last_name": "HyperCore",
    },
]

DEFAULT_PASSWORD = "HyperCore2026!"


class Command(BaseCommand):
    help = "Create initial admin users for Team HyperCore."

    def add_arguments(self, parser):
        parser.add_argument(
            "--password",
            type=str,
            default=DEFAULT_PASSWORD,
            help=(
                "Password for all created admin users. "
                f"Defaults to '{DEFAULT_PASSWORD}'. "
                "Admins should change this on first login."
            ),
        )

    def handle(self, *args, **options):
        password = options["password"]
        created_count = 0
        skipped_count = 0

        for admin_data in INITIAL_ADMINS:
            username = admin_data["username"]

            if User.objects.filter(username=username).exists():
                self.stdout.write(
                    self.style.WARNING(f"  SKIPPED: '{username}' already exists")
                )
                skipped_count += 1
                continue

            User.objects.create_user(
                username=username,
                password=password,
                first_name=admin_data["first_name"],
                last_name=admin_data["last_name"],
                is_staff=True,
            )
            self.stdout.write(
                self.style.SUCCESS(f"  CREATED: '{username}'")
            )
            created_count += 1

        self.stdout.write("")
        self.stdout.write(
            self.style.SUCCESS(
                f"Done — {created_count} created, {skipped_count} skipped."
            )
        )
