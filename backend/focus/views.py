from rest_framework import generics, permissions
from .models import FocusSession
from .serializers import FocusSessionSerializer
# from django.shortcuts import render

# Create your views here.
class FocusSessionListCreate(generics.ListCreateAPIView):
    serializer_class = FocusSessionSerializer
    # enforcing that only logged in users can access this view
    permission_classes = [permissions.IsAuthenticated]

    # overriding the default query to only return the logged-in user's universe
    def get_queryset(self):
        return FocusSession.objects.filter(user=self.request.user).order_by('-start_time')

    # automatically attaching the logged-in user when a new star is created
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

