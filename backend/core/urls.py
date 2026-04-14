from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from . import views

urlpatterns = [
    # Auth (public)
    path('auth/login', views.ThrottledTokenObtainPairView.as_view(), name='auth-login'),
    path('auth/refresh', TokenRefreshView.as_view(), name='auth-refresh'),
    path('auth/register', views.RegistrationView.as_view(), name='auth-register'),
    path('auth/me', views.AuthMeView.as_view(), name='auth-me'),
    # Tickets (public & admin)
    path('tickets/me', views.MyTicketsView.as_view(), name='ticket-me'),
    path('tickets/reserve', views.TicketReserveView.as_view(), name='ticket-reserve'),
    path('tickets', views.TicketCreateView.as_view(), name='ticket-create'),
    path('tickets/bulk', views.TicketBulkCreateView.as_view(), name='ticket-bulk-create'),
    path('tickets/', views.TicketListView.as_view(), name='ticket-list'),
    path('tickets/<uuid:ticket_id>', views.TicketDetailView.as_view(), name='ticket-detail'),
    path('tickets/<uuid:ticket_id>/cancel', views.TicketCancelView.as_view(), name='ticket-cancel'),
    path('tickets/<uuid:ticket_id>/edit', views.TicketEditView.as_view(), name='ticket-edit'),
    path('tickets/<uuid:ticket_id>/approve', views.TicketApproveView.as_view(), name='ticket-approve'),
    path('tickets/<uuid:ticket_id>/validate', views.TicketValidateView.as_view(), name='ticket-validate'),
    # Ticket downloads (admin)
    path('tickets/<uuid:ticket_id>/download/pdf', views.TicketDownloadPDFView.as_view(), name='ticket-download-pdf'),
    path('tickets/<uuid:ticket_id>/download/wallet', views.TicketDownloadWalletView.as_view(), name='ticket-download-wallet'),
    path('tickets/<uuid:ticket_id>/download/google-wallet', views.TicketDownloadGoogleWalletView.as_view(), name='ticket-download-google-wallet'),
    # Draw (execute = admin, results = public)
    path('draw/execute', views.DrawExecuteView.as_view(), name='draw-execute'),
    path('draw/results', views.DrawResultsPublicView.as_view(), name='draw-results'),
    path('draw/expire-tickets', views.ExpireTicketsView.as_view(), name='draw-expire-tickets'),
    # Dashboard (public)
    path('dashboard', views.DashboardView.as_view(), name='dashboard'),
    # Fundraising extra (admin)
    path('fundraising-extra', views.FundraisingExtraView.as_view(), name='fundraising-extra'),
]
