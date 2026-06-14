from rest_framework import serializers
from decimal import Decimal
from .models import Expense, ExpenseSplit
from apps.accounts.serializers import UserSerializer


class ExpenseSplitSerializer(serializers.ModelSerializer):
    member_name = serializers.ReadOnlyField()
    user_detail = UserSerializer(source='user', read_only=True)

    class Meta:
        model = ExpenseSplit
        fields = ['id', 'user', 'user_detail', 'participant_name', 'owed_amount',
                  'split_value', 'member_name']


class ExpenseSplitInputSerializer(serializers.Serializer):
    user_id = serializers.IntegerField(required=False, allow_null=True)
    participant_name = serializers.CharField(required=False, allow_blank=True)
    split_value = serializers.DecimalField(
        max_digits=10, decimal_places=4, required=False, allow_null=True
    )


class ExpenseSerializer(serializers.ModelSerializer):
    splits = ExpenseSplitSerializer(many=True, read_only=True)
    paid_by_detail = UserSerializer(source='paid_by', read_only=True)
    payer_name = serializers.ReadOnlyField()

    class Meta:
        model = Expense
        fields = [
            'id', 'group', 'description', 'date', 'amount', 'currency',
            'exchange_rate', 'amount_inr', 'paid_by', 'paid_by_detail',
            'paid_by_name', 'split_type', 'notes', 'payer_name',
            'splits', 'created_at', 'updated_at',
        ]
        read_only_fields = ['amount_inr', 'created_at', 'updated_at']


class ExpenseCreateSerializer(serializers.ModelSerializer):
    splits_input = ExpenseSplitInputSerializer(many=True, write_only=True, required=False)

    class Meta:
        model = Expense
        fields = [
            'group', 'description', 'date', 'amount', 'currency',
            'exchange_rate', 'paid_by', 'paid_by_name', 'split_type',
            'notes', 'splits_input',
        ]

    def validate(self, data):
        if not data.get('paid_by') and not data.get('paid_by_name'):
            raise serializers.ValidationError(
                'Either paid_by (user) or paid_by_name must be provided.'
            )
        return data

    def create(self, validated_data):
        splits_input = validated_data.pop('splits_input', [])
        expense = Expense.objects.create(
            created_by=self.context['request'].user,
            **validated_data
        )
        self._create_splits(expense, splits_input)
        return expense

    def update(self, instance, validated_data):
        splits_input = validated_data.pop('splits_input', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if splits_input is not None:
            instance.splits.all().delete()
            self._create_splits(instance, splits_input)
        return instance

    def _create_splits(self, expense, splits_input):
        from django.contrib.auth import get_user_model
        User = get_user_model()

        total = expense.amount_inr
        split_type = expense.split_type
        n = len(splits_input)
        if n == 0:
            return

        if split_type == 'equal':
            each = (total / n).quantize(Decimal('0.01'))
            # Distribute rounding remainder to first participant
            remainder = total - each * n
            for idx, s in enumerate(splits_input):
                amt = each + (remainder if idx == 0 else Decimal('0'))
                self._make_split(expense, s, amt)

        elif split_type == 'unequal':
            for s in splits_input:
                amt = Decimal(str(s.get('split_value') or 0))
                # Convert to INR if needed
                amt = (amt * expense.exchange_rate).quantize(Decimal('0.01'))
                self._make_split(expense, s, amt)

        elif split_type == 'percentage':
            for s in splits_input:
                pct = Decimal(str(s.get('split_value') or 0))
                amt = (total * pct / Decimal('100')).quantize(Decimal('0.01'))
                self._make_split(expense, s, amt)

        elif split_type == 'share':
            total_shares = sum(
                Decimal(str(s.get('split_value') or 1)) for s in splits_input
            )
            if total_shares == 0:
                total_shares = Decimal(n)
            for s in splits_input:
                share = Decimal(str(s.get('split_value') or 1))
                amt = (total * share / total_shares).quantize(Decimal('0.01'))
                self._make_split(expense, s, amt)

    def _make_split(self, expense, split_data, owed_amount):
        from django.contrib.auth import get_user_model
        User = get_user_model()
        user = None
        uid = split_data.get('user_id')
        if uid:
            try:
                user = User.objects.get(id=uid)
            except User.DoesNotExist:
                pass
        ExpenseSplit.objects.create(
            expense=expense,
            user=user,
            participant_name=split_data.get('participant_name', ''),
            owed_amount=owed_amount,
            split_value=split_data.get('split_value'),
        )
