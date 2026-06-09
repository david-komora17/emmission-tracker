from rest_framework import permissions

class IsOwner(permissions.BasePermission):
    """
    Custom permission to only allow owners of an object to edit or view it.
    """

    def has_object_permission(self, request, view, obj):
        # Explicit ownership mapping
        return obj.user == request.user
    