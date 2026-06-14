from rest_framework.permissions import BasePermission


class IsGroupMember(BasePermission):
    """Allow access only to members of the group referenced in the view."""

    def has_object_permission(self, request, view, obj):
        # obj is the Group instance
        return obj.memberships.filter(user=request.user, left_at__isnull=True).exists()
