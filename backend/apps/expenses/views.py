from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404

from .models import Expense
from .serializers import ExpenseSerializer, ExpenseCreateSerializer
from .balance_service import calculate_balances, simplify_debts
from apps.groups.models import Group


class ExpenseListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        group_id = self.request.query_params.get('group')
        qs = Expense.objects.filter(
            group__memberships__user=self.request.user,
            is_deleted=False
        ).distinct().select_related('paid_by').prefetch_related('splits__user')
        if group_id:
            qs = qs.filter(group_id=group_id)
        return qs.order_by('-date', '-created_at')

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return ExpenseCreateSerializer
        return ExpenseSerializer

    def create(self, request, *args, **kwargs):
        serializer = ExpenseCreateSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        expense = serializer.save()
        return Response(ExpenseSerializer(expense).data, status=status.HTTP_201_CREATED)


class ExpenseDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Expense.objects.filter(
            group__memberships__user=self.request.user,
            is_deleted=False
        ).distinct()

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return ExpenseCreateSerializer
        return ExpenseSerializer

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = ExpenseCreateSerializer(
            instance, data=request.data, partial=partial,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        expense = serializer.save()
        return Response(ExpenseSerializer(expense).data)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.is_deleted = True
        instance.save()
        return Response(status=status.HTTP_204_NO_CONTENT)


class GroupBalancesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, group_id):
        group = get_object_or_404(
            Group, id=group_id, memberships__user=request.user
        )
        balances, user_names, breakdown = calculate_balances(group)
        transactions = simplify_debts(balances)

        # Enrich transactions with names
        enriched_transactions = []
        for t in transactions:
            enriched_transactions.append({
                'from_user_id': t['from_user'],
                'from_user_name': user_names.get(t['from_user'], f'User #{t["from_user"]}'),
                'to_user_id': t['to_user'],
                'to_user_name': user_names.get(t['to_user'], f'User #{t["to_user"]}'),
                'amount': float(t['amount']),
            })

        balance_list = []
        for uid, net in balances.items():
            balance_list.append({
                'user_id': uid,
                'user_name': user_names.get(uid, f'User #{uid}'),
                'net_balance': float(net),
                'expenses': breakdown.get(uid, []),
            })
        balance_list.sort(key=lambda x: x['net_balance'])

        return Response({
            'group_id': group_id,
            'balances': balance_list,
            'settlements_needed': enriched_transactions,
        })
