from django.db import models
from django.contrib.auth.models import User

# Create your models here.
class FocusSession(models.Model):
    STATUS_CHOICES = [
        ('completed', 'Completed'),
        ('aborted', 'Aborted - Core Collapse'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE)
    start_time = models.DateTimeField(auto_now_add=True)
    end_time = models.DateTimeField(null=True, blank=True)
    duration_minutes = models.IntegerField(default=0)
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='completed')
    task_tag = models.CharField(max_length=100, blank=True)
    
    def __str__(self):
        return f"{self.user.username} - {self.duration_minutes}m ({self.status})"

    @property
    def stellar_object(self):
        """
        Classifies the session based on focus duration.
        """
        if self.status == 'aborted':
            return 'Nebular Remnant'
        if self.duration_minutes < 25:
            return 'Asteroid'
        elif self.duration_minutes < 60:
            return 'Red Dwarf (M-type)'
        elif self.duration_minutes < 120:
            return 'Sun-like (G-type)'
        else:
            return 'Blue Giant (O-type)'

