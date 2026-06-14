from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import Settlement
from .serializers import SettlementSerializer, SettlementCreateSerializer


class SettlementListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        group_id = self.request.query_params.get('group')
        qs = Settlement.objects.filter(
            group__memberships__user=self.request.user
        ).distinct().select_related('payer', 'payee')
        if group_id:
            qs = qs.filter(group_id=group_id)
        return qs

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return SettlementCreateSerializer
        return SettlementSerializer

    def create(self, request, *args, **kwargs):
        serializer = SettlementCreateSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        settlement = serializer.save()
        return Response(SettlementSerializer(settlement).data, status=status.HTTP_201_CREATED)


class SettlementDetailView(generics.RetrieveDestroyAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = SettlementSerializer

    def get_queryset(self):
        return Settlement.objects.filter(
            group__memberships__user=self.request.user
        ).distinct()
