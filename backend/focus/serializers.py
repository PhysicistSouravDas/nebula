from rest_framework import serializers
from .models import FocusSession

class FocusSessionSerializer(serializers.ModelSerializer):
    # explicitly including our custom property so the frontend knows
    # what kind of star was born!
    stellar_object = serializers.ReadOnlyField()

    class Meta:
        model = FocusSession
        fields = ['id', 'user', 'start_time', 'end_time', 'duration_minutes', 'status', 'task_tag', 'stellar_object']

