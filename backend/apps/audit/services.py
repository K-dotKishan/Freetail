from .models import AuditLog


def log_action(user, action, model_name, object_id=None, description='', extra_data=None):
    AuditLog.objects.create(
        user=user,
        action=action,
        model_name=model_name,
        object_id=object_id,
        description=description,
        extra_data=extra_data or {},
    )
