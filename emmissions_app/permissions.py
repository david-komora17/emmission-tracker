from rest_framework import permissions
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import Throttled
from django.utils import timezone

class IsOwner(permissions.BasePermission):
    """
    Grant access strictly to system administrators. 
    """

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.is_staff
    
class IsHighestPaidTier(permissions.BasePermission):
    """
    Grants access strictly to users who have unlocked the premium tier.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False 
        
        # Admins bypass paywalls, otherwise check premium boolean field
        return request.user.is_staff or getattr(request.user.profile, 'is_premium', False)
    
class PremiumTierPermission(IsAuthenticated):
    """
    Grants access if is_premium is true AND the current timestamp is within 
    the active subscription window. Automatically returns 429 Throttled 
    when the limit is crossed.
    """
    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        
        try:
            profile = request.user.userprofile  
            
            # Timeline Guard: Check if subscription has run its course
            if profile.is_premium:
                if timezone.now() > profile.premium_expiry_date:
                    # Time window has closed. Downgrade account instantly.
                    profile.is_premium = False
                    profile.account_tier = 'Free'
                    profile.save()
                else:
                    return True
                
            # Free Tier Evaluation
            if profile.ai_query_count >= 5:
                raise Throttled(
                    detail={
                        "error": "Beyond this point you need to subscribe to unlock unlimited capabilities.",
                        "code": "TRIAL_EXPIRED",
                        "current_usage": profile.ai_query_count,
                        "amount_payable": 5.00  # Matched to your exact payment specification
                    }
                )
            return True
            
        except AttributeError:
            return False