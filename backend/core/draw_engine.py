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

    if len(active_tickets) < MIN_ACTIVE_TICKETS:
        raise DrawError(
            f"Cannot execute draw: need at least {MIN_ACTIVE_TICKETS} "
            f"active tickets, but only {len(active_tickets)} found."
        )

    winners = random.sample(active_tickets, MIN_ACTIVE_TICKETS)

    results = []
    for rank, ticket in enumerate(winners, start=1):
        results.append({
            "ticket": ticket,
            "prize_rank": rank,
            "prize_name": PRIZES[rank],
        })

    return results
