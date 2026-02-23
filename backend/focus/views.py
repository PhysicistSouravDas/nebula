from rest_framework import generics
from .models import FocusSession
from .serializers import FocusSessionSerializer
# from django.shortcuts import render

# Create your views here.
class FocusSessionListCreate(generics.ListCreateAPIView):
    queryset = FocusSession.objects.all().order_by('-start_time')
    serializer_class = FocusSessionSerializer

    # for now, we will manually pass the user ID when creating a session.
    # later, we will secure this with proper authentication tokens.

