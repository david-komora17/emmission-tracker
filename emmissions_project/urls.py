# emmissions_project/urls.py
from django.contrib import admin
from django.urls import path
from emmissions_app.views import ComplaintFunnelView, PremiumEcoSwapperView, CustomRegisterView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns = [
    path('admin/', admin.site.urls),
    # This delegates all application logic securely to your app folder
    path('api/feedback/complaints/', ComplaintFunnelView.as_view(), name='complaints-funnel'),
    path('api/premium/eco-swap/', PremiumEcoSwapperView.as_view(), name='premium-eco-swap'),
     # Global Custom Auth Management
    path('api/auth/register/', CustomRegisterView.as_view(), name='custom-register'),
    path('api/auth/login/', TokenObtainPairView.as_view(), name='token-obtain-pair'),
    path('api/auth/token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
]
