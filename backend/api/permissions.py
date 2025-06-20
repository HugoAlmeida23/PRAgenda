# api/permissions.py

from rest_framework.permissions import BasePermission
from .models import Profile

# --- Organization Level Permissions ---

class IsOrgAdmin(BasePermission):
    """
    Custom permission to only allow organization admins to access an object.
    """
    message = "You do not have administrative privileges for this organization."

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        if request.user.is_superuser:
            return True
        try:
            profile = request.user.profile
            if not (profile.is_org_admin and profile.organization):
                return False
            
            object_organization = None
            if hasattr(obj, 'organization'):
                object_organization = obj.organization
            elif obj.__class__.__name__ == 'Organization':
                object_organization = obj
            elif hasattr(obj, 'client') and hasattr(obj.client, 'organization'): # For Tasks, TimeEntries
                object_organization = obj.client.organization

            return profile.organization == object_organization
        except Profile.DoesNotExist:
            return False

class IsMemberOfOrganization(BasePermission):
    """
    Allows access only to users who are members of the same organization
    as the object being accessed.
    """
    message = "You do not have permission to access objects in this organization."

    def has_object_permission(self, request, view, obj):
        if request.user.is_superuser:
            return True
        try:
            profile = request.user.profile
            if not profile.organization:
                return False

            object_organization = None
            if hasattr(obj, 'organization'):
                object_organization = obj.organization
            elif hasattr(obj, 'client') and hasattr(obj.client, 'organization'):
                object_organization = obj.client.organization
            
            return profile.organization == object_organization
        except Profile.DoesNotExist:
            return False

# --- Client Level Permissions ---

class CanManageClients(BasePermission):
    """
    Allows access if user has client management permissions.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        try:
            # For list/create views
            profile = request.user.profile
            return profile.is_org_admin or profile.can_manage_clients or profile.can_create_clients
        except Profile.DoesNotExist:
            return request.user.is_superuser

    def has_object_permission(self, request, view, obj):
        # `obj` is a Client instance
        if request.user.is_superuser:
            return True
        try:
            profile = request.user.profile
            is_admin_or_manager = profile.is_org_admin or profile.can_manage_clients
            can_edit = profile.can_edit_clients
            
            if view.action in ['update', 'partial_update']:
                return is_admin_or_manager or can_edit
            if view.action == 'destroy':
                return profile.is_org_admin or profile.can_delete_clients
            if view.action == 'toggle_status':
                 return profile.is_org_admin or profile.can_change_client_status
            
            # For retrieve (GET)
            return profile.can_access_client(obj)
        except Profile.DoesNotExist:
            return False

# --- Task Level Permissions ---
# (This is already handled well by the TaskManager, so a separate class is optional
# but can be useful for clarity or for actions not covered by get_queryset)

# --- Time Entry Permissions ---

class CanManageTimeEntry(BasePermission):
    """
    Allows access to time entries based on user's role.
    """
    def has_permission(self, request, view):
        # Allows any authenticated user to attempt to list or create
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        # `obj` is a TimeEntry instance
        if request.user.is_superuser:
            return True
        try:
            profile = request.user.profile
            is_owner = obj.user == request.user

            if profile.is_org_admin or profile.can_edit_all_time:
                return True
            if is_owner and profile.can_edit_own_time:
                return True
            
            # Allow viewing if user can view team time
            if request.method in ['GET', 'HEAD', 'OPTIONS']:
                 return profile.can_view_team_time

            return False
        except Profile.DoesNotExist:
            return False