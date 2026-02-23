from django.urls import path
from .views import FocusSessionListCreate

urlpatterns = [
    path('sessions/', FocusSessionListCreate.as_view(), name='session-list-create'),
]

