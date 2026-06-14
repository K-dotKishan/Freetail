from rest_framework import serializers
from .models import Settlement
from apps.accounts.serializers import UserSerializer


class SettlementSerializer(serializers.ModelSerializer):
    payer_detail = UserSerializer(source='payer', read_only=True)
    payee_detail = UserSerializer(source='payee', read_only=True)

    class Meta:
        model = Settlement
        fields = [
            'id', 'group', 'payer', 'payer_detail', 'payee', 'payee_detail',
            'amount', 'date', 'notes', 'created_at',
        ]
        read_only_fields = ['created_at']


class SettlementCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Settlement
        fields = ['group', 'payer', 'payee', 'amount', 'date', 'notes']

    def create(self, validated_data):
        return Settlement.objects.create(
            created_by=self.context['request'].user,
            **validated_data
        )
