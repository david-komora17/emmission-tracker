# emmissions_project/urls.py
from django.contrib import admin
from django.urls import path
from emmissions_app.views import (
    ComplaintFunnelView,
    PremiumAIActionView, 
    CustomRegisterView, 
    CustomLoginView,
    MpesaCheckoutView,
    MpesaCarbonmarkCallbackView,
    ProductScannerIngestionView,
    VoiceLogView,
    PaymentStatusView,
    UserProfileDashboardView
)
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # Auth Management
    path('api/auth/register/', CustomRegisterView.as_view(), name='custom-register'),
    path('api/auth/login/', CustomLoginView.as_view(), name='custom-login'),
    path('api/auth/token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    
    # Systems & Feedback
    path('api/feedback/complaints/', ComplaintFunnelView.as_view(), name='complaints-funnel'),
    path('api/feedback/complaints/<int:complaint_id>/', ComplaintFunnelView.as_view(), name='complaints-detail'),
    # AI Optimizers
    path('api/premium/ai-optimizer/', PremiumAIActionView.as_view(), name='premium-ai-optimizer'),
    
    # Document / QR Parsing Engine
    path('api/scanner/ingest/', ProductScannerIngestionView.as_view(), name='scanner-ingest'),

    # Audio logging engine
    path('api/voice/log/', VoiceLogView.as_view(), name='voice-log'),
    
    # Payments & Offsets
    path('api/payments/checkout/', MpesaCheckoutView.as_view(), name='mpesa-checkout'),
    path('api/payments/mpesa-callback/', MpesaCarbonmarkCallbackView.as_view(), name='mpesa-callback'),
    path('api/payments/status/<str:checkout_id>/', PaymentStatusView.as_view(), name='payment-status'),

    # Endpoint to track my carbon footprint
    path('api/user/profile/', UserProfileDashboardView.as_view(), name='user-profile-dashboard'),
]