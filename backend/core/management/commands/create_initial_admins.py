"""
Management command to create initial admin users for Team HyperCore.

Usage:
    python manage.py create_initial_admins
    python manage.py create_initial_admins --password mysecretpass
"""

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand


# Team HyperCore members — initial admin accounts
INITIAL_ADMINS = [
    {
        "username": "admin_meca1",
        "first_name": "HyperCore",
        "last_name": "Mechatronics 1",
    },
    {
        "username": "admin_meca2",
        "first_name": "HyperCore",
        "last_name": "Mechatronics 2",
    },
    {
        "username": "admin_dev1",
        "first_name": "HyperCore",
        "last_name": "Developer 1",
    },
    {
        "username": "admin_dev2",
        "first_name": "HyperCore",
        "last_name": "Developer 2",
    },
    {
        "username": "admin_member5",
        "first_name": "HyperCore",
        "last_name": "Member 5",
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
