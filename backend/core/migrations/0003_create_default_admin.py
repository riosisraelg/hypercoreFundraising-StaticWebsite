from django.db import migrations
from django.contrib.auth import get_user_model
import os

def create_default_admin(apps, schema_editor):
    User = get_user_model()
    admin_email = "admin@hypercore.lat"
    admin_password = "HyperCoreAdmin2026!"
    
    if not User.objects.filter(username=admin_email).exists():
        User.objects.create_superuser(
            username=admin_email,
            email=admin_email,
            password=admin_password,
            first_name="Admin",
            last_name="HyperCore"
        )
        print(f"✅ Created superuser: {admin_email}")
    else:
        print(f"ℹ️ Superuser {admin_email} already exists.")

class Migration(migrations.Migration):

    dependencies = [
        ('core', '0002_remove_ticket_cancelled_at_user_phone_and_more'),
    ]

    operations = [
        migrations.RunPython(create_default_admin),
    ]
