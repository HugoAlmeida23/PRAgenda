from celery.result import AsyncResult
from django.contrib.auth.models import User
from rest_framework import generics, viewsets
from rest_framework.permissions import IsAuthenticated, AllowAny
from .serializers import UserSerializer
from supabase import create_client, Client
from django.conf import settings
import logging
import os 



logger = logging.getLogger('citius-app')


# Initialize Supabase client (not used for file upload directly but may be used for DB interaction)
supabase: Client = create_client(
    os.getenv('SUPABASE_URL'),
    os.getenv('SUPABASE_ACCESS_KEY')
)

logger = logging.getLogger('citius-app')

# Create your views here.
class CreateUserView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [AllowAny]
