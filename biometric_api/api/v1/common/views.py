from rest_framework.throttling import ScopedRateThrottle
from rest_framework_simplejwt.views import TokenObtainPairView


class ThrottledTokenObtainPairView(TokenObtainPairView):
    """Login JWT con rate limiting propio (scope "login") además del
    bloqueo por intentos fallidos que aplica django-axes."""

    throttle_classes = (ScopedRateThrottle,)
    throttle_scope = "login"
