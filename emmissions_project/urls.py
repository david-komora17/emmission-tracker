# emmissions_project/urls.py
from django.contrib import admin
from django.urls import path
from .views import ComplaintFunnelView, PremiumEcoSwapperView

urlpatterns = [
    path('admin/', admin.site.urls),
    # This delegates all application logic securely to your app folder
    path('api/feedback/complaints/', ComplaintFunnelView.as_view(), name='complaints-funnel'),
    path('api/premium/eco-swap/', PremiumEcoSwapperView.as_view(), name='premium-eco-swap'),

]