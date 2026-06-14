from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model

from .models import Group, Membership
from .serializers import GroupSerializer, GroupCreateSerializer, MembershipSerializer

User = get_user_model()


class GroupListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Group.objects.filter(
            memberships__user=self.request.user
        ).distinct().prefetch_related('memberships__user')

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return GroupCreateSerializer
        return GroupSerializer

    def create(self, request, *args, **kwargs):
        serializer = GroupCreateSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        group = serializer.save()
        return Response(GroupSerializer(group).data, status=status.HTTP_201_CREATED)


class GroupDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = GroupSerializer

    def get_queryset(self):
        return Group.objects.filter(
            memberships__user=self.request.user
        ).distinct().prefetch_related('memberships__user')


class MembershipAddView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, group_id):
        group = get_object_or_404(Group, id=group_id)
        user_id = request.data.get('user_id')
        joined_at = request.data.get('joined_at')
        if not user_id or not joined_at:
            return Response({'error': 'user_id and joined_at are required.'}, status=400)
        user = get_object_or_404(User, id=user_id)
        membership, created = Membership.objects.get_or_create(
            group=group, user=user,
            defaults={'joined_at': joined_at}
        )
        if not created:
            # Re-activating a past member
            membership.left_at = None
            membership.joined_at = joined_at
            membership.save()
        return Response(MembershipSerializer(membership).data, status=201 if created else 200)


class MembershipLeaveView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, group_id, membership_id):
        membership = get_object_or_404(Membership, id=membership_id, group_id=group_id)
        left_at = request.data.get('left_at')
        if not left_at:
            return Response({'error': 'left_at is required.'}, status=400)
        membership.left_at = left_at
        membership.save()
        return Response(MembershipSerializer(membership).data)
