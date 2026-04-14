"""
Draw Engine — isolated module for randomized winner selection.

Selects exactly 3 distinct winners from all active tickets,
assigning prize ranks 1st, 2nd, and 3rd.
"""

import random

from .models import DrawResult, Ticket

PRIZES = {
    1: "$5,000 MXN",
    2: "JBL Flip 7",
    3: "Botella Maestro Dobel",
}

MIN_ACTIVE_TICKETS = 3


class DrawError(Exception):
    """Raised when the draw cannot be executed."""
    pass


def execute_draw():
    """
    Fetch all active tickets, randomly select 3 distinct winners,
    and return a list of dicts with ticket, prize_rank, and prize_name.

    Raises DrawError if fewer than 3 active tickets exist.
    """
    active_tickets = list(
        Ticket.objects.filter(status=Ticket.Status.ACTIVE)
    )

    owner_groups = {}
    for t in active_tickets:
        owner_key = t.reserved_by_id if t.reserved_by_id else (t.full_name.strip().lower(), t.phone.strip())
        if owner_key not in owner_groups:
            owner_groups[owner_key] = []
        owner_groups[owner_key].append(t)

    if len(owner_groups) < MIN_ACTIVE_TICKETS:
        raise DrawError(
            f"Cannot execute draw: need at least {MIN_ACTIVE_TICKETS} distinct owners, "
            f"but only found tickets for {len(owner_groups)} distinct owners."
        )

    winner_owners = random.sample(list(owner_groups.keys()), MIN_ACTIVE_TICKETS)
    winners = [random.choice(owner_groups[owner]) for owner in winner_owners]

    results = []
    for rank, ticket in enumerate(winners, start=1):
        results.append({
            "ticket": ticket,
            "prize_rank": rank,
            "prize_name": PRIZES[rank],
        })

    return results
