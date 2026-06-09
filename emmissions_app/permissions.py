from rest_framework import permissions

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