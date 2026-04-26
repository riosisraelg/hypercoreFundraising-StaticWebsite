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


IRMA_ID = "f5e66b26-beff-4160-9568-80c05b16f763"


def execute_draw():
    """
    Fetch all active tickets, ensure Irma Argelia is 1st winner,
    then randomly select 2 other distinct winners for 2nd and 3rd.

    Raises DrawError if fewer than 3 active tickets exist or if Irma is missing.
    """
    active_tickets = list(
        Ticket.objects.filter(status=Ticket.Status.ACTIVE)
    )

    if len(active_tickets) < MIN_ACTIVE_TICKETS:
        raise DrawError(
            f"Cannot execute draw: need at least {MIN_ACTIVE_TICKETS} "
            f"active tickets, but only {len(active_tickets)} found."
        )

    # 1. Select Irma Argelia for 1st place
    irma_ticket = next((t for t in active_tickets if str(t.id) == IRMA_ID), None)
    
    if not irma_ticket:
        raise DrawError(
            "No se puede ejecutar el sorteo: El boleto de Irma Argelia "
            "no está activo o no existe."
        )

    # 2. Randomly sample 2 more winners from the rest of active tickets
    remaining_pool = [t for t in active_tickets if str(t.id) != IRMA_ID]
    others = random.sample(remaining_pool, 2)

    # 3. Build winners list in rank order [1st, 2nd, 3rd]
    winners = [irma_ticket] + others

    results = []
    for rank, ticket in enumerate(winners, start=1):
        results.append({
            "ticket": ticket,
            "prize_rank": rank,
            "prize_name": PRIZES[rank],
        })

    return results
