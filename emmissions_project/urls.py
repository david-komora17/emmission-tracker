# emmissions_project/urls.py
from django.contrib import admin
from django.urls import path
from emmissions_app.views import (
    ComplaintFunnelView, 
    PremiumEcoSwapperView, 
    CustomRegisterView, 
    PremiumAICoachView,
    MpesaCheckoutView,
    MpesaCarbonmarkCallbackView,
    ProductScannerIngestionView  # Fully integrated here now!
)
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # Auth Management
    path('api/auth/register/', CustomRegisterView.as_view(), name='custom-register'),
    path('api/auth/login/', TokenObtainPairView.as_view(), name='token-obtain-pair'),
    path('api/auth/token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    
    # Systems & Feedback
    path('api/feedback/complaints/', ComplaintFunnelView.as_view(), name='complaints-funnel'),
    
    # AI Optimizers
    path('api/premium/ai-coach/', PremiumAICoachView.as_view(), name='premium-ai-coach'),
    path('api/premium/eco-swap/', PremiumEcoSwapperView.as_view(), name='premium-eco-swap'),
    
    # Document / QR Parsing Engine
    path('api/scanner/ingest/', ProductScannerIngestionView.as_view(), name='scanner-ingest'),
    
    # Payments & Offsets
    path('api/payments/checkout/', MpesaCheckoutView.as_view(), name='mpesa-checkout'),
    path('api/payments/mpesa-callback/', MpesaCarbonmarkCallbackView.as_view(), name='mpesa-callback'),
]