from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Group, Membership
from apps.accounts.serializers import UserSerializer

User = get_user_model()


class MembershipSerializer(serializers.ModelSerializer):
    user_detail = UserSerializer(source='user', read_only=True)
    user = serializers.PrimaryKeyRelatedField(queryset=User.objects.all())

    class Meta:
        model = Membership
        fields = ['id', 'user', 'user_detail', 'joined_at', 'left_at', 'guest_name']


class GroupSerializer(serializers.ModelSerializer):
    memberships = MembershipSerializer(many=True, read_only=True)
    created_by_detail = UserSerializer(source='created_by', read_only=True)
    member_count = serializers.SerializerMethodField()

    class Meta:
        model = Group
        fields = [
            'id', 'name', 'description', 'default_currency',
            'created_by', 'created_by_detail', 'created_at',
            'memberships', 'member_count',
        ]
        read_only_fields = ['created_by', 'created_at']

    def get_member_count(self, obj):
        return obj.memberships.filter(left_at__isnull=True).count()


class GroupCreateSerializer(serializers.ModelSerializer):
    member_ids = serializers.ListField(
        child=serializers.IntegerField(), write_only=True, required=False
    )
    joined_at = serializers.DateField(write_only=True, required=False)

    class Meta:
        model = Group
        fields = ['name', 'description', 'default_currency', 'member_ids', 'joined_at']

    def create(self, validated_data):
        member_ids = validated_data.pop('member_ids', [])
        joined_at = validated_data.pop('joined_at', None)
        request = self.context['request']
        group = Group.objects.create(created_by=request.user, **validated_data)

        from django.utils import timezone
        default_date = joined_at or timezone.now().date()

        # Add creator as member
        Membership.objects.get_or_create(
            group=group,
            user=request.user,
            defaults={'joined_at': default_date}
        )
        for uid in member_ids:
            if uid != request.user.id:
                try:
                    user = User.objects.get(id=uid)
                    Membership.objects.get_or_create(
                        group=group,
                        user=user,
                        defaults={'joined_at': default_date}
                    )
                except User.DoesNotExist:
                    pass
        return group
