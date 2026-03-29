"""
Custom DRF throttle classes for public endpoint rate limiting.

Requirement 11.3: Rate limiting on public endpoints to prevent abuse.
"""
from rest_framework.throttling import AnonRateThrottle


class PublicEndpointThrottle(AnonRateThrottle):
    """Rate limit for public read endpoints (results, dashboard)."""
    scope = 'public'


class LoginThrottle(AnonRateThrottle):
    """Stricter rate limit for the login endpoint to prevent brute-force."""
    scope = 'login'
