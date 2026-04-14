"""
migrate_to_production.py
========================
Migrates legacy RDS data into the new Supabase/PostgreSQL database.

Handles:
1. Strips 'cancelled_at' field (removed from model)
2. Skips cancelled tickets (physically deleted in new model)
3. Only imports active tickets
4. Imports FundraisingExtra data

Usage (after setting DATABASE_URL in backend/.env to Supabase):
    cd backend
    python manage.py migrate          # Create tables first
    python migrate_to_production.py   # Then run this script
"""

import os
import sys
import json
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from core.models import Ticket, FundraisingExtra

DATA_FILE = os.path.join(os.path.dirname(__file__), 'rds_data_fixed.json')


def migrate():
    with open(DATA_FILE) as f:
        data = json.load(f)

    # --- Tickets ---
    tickets = [r for r in data if r['model'] == 'core.ticket']
    active_tickets = [t for t in tickets if t['fields']['status'] == 'active']
    cancelled_tickets = [t for t in tickets if t['fields']['status'] == 'cancelled']

    print(f"📊 Found {len(tickets)} total tickets")
    print(f"   ✅ Active: {len(active_tickets)} (will import)")
    print(f"   ❌ Cancelled: {len(cancelled_tickets)} (will skip)")
    print()

    imported = 0
    skipped = 0

    for record in active_tickets:
        pk = record['pk']
        fields = record['fields']

        # Strip fields that no longer exist in the model
        fields.pop('cancelled_at', None)
        fields.pop('created_by', None)  # Was set to null in fix_data.py

        # Check if ticket already exists (idempotent)
        if Ticket.objects.filter(pk=pk).exists():
            print(f"   ⏭️  {fields['folio']} already exists, skipping")
            skipped += 1
            continue

        Ticket.objects.create(
            id=pk,
            folio=fields['folio'],
            full_name=fields['full_name'],
            phone=fields['phone'],
            status='active',  # All legacy tickets are already validated
            created_at=fields['created_at'],
        )
        imported += 1
        print(f"   ✅ Imported {fields['folio']} — {fields['full_name']}")

    print(f"\n🎟️  Tickets: {imported} imported, {skipped} skipped")

    # --- FundraisingExtra ---
    extras = [r for r in data if r['model'] == 'core.fundraisingextra']
    for record in extras:
        obj, created = FundraisingExtra.objects.get_or_create(
            pk=record['pk'],
            defaults={'amount': record['fields']['amount']}
        )
        if created:
            print(f"✅ FundraisingExtra created: ${obj.amount} MXN")
        else:
            print(f"⏭️  FundraisingExtra already exists: ${obj.amount} MXN")

    print("\n🎉 Migration complete!")


if __name__ == '__main__':
    migrate()
