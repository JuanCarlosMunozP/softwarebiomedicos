import pytest
from django.core.cache import cache
from django.urls import reverse

from api.v1.common.views import ThrottledTokenObtainPairView

from .factories import UserFactory

TOKEN_URL = reverse("v1:token-obtain")
REFRESH_URL = reverse("v1:token-refresh")
BLACKLIST_URL = reverse("v1:token-blacklist")
ME_URL = reverse("v1:users:user-me")


@pytest.fixture(autouse=True)
def _clear_throttle_cache():
    # El throttle de DRF usa el cache por defecto; se limpia entre tests
    # para que no se contaminen los contadores de un test a otro.
    cache.clear()
    yield
    cache.clear()


@pytest.mark.django_db
class TestLoginThrottle:
    def test_sixth_attempt_in_a_minute_is_throttled(self, api_client, settings):
        # Se desactiva el lockout de axes para aislar el comportamiento del throttle.
        settings.AXES_FAILURE_LIMIT = 1000

        for _ in range(5):
            response = api_client.post(
                TOKEN_URL, {"username": "nadie", "password": "incorrecta"}, format="json"
            )
            assert response.status_code == 401

        response = api_client.post(
            TOKEN_URL, {"username": "nadie", "password": "incorrecta"}, format="json"
        )
        assert response.status_code == 429


@pytest.mark.django_db
class TestLoginLockout:
    def test_locks_out_after_failure_limit_even_with_correct_password(
        self, api_client, settings, monkeypatch
    ):
        # Se desactiva el throttle (clase con rate fijado en import) para que
        # no interfiera con el test de axes; ver nota en TestLoginThrottle.
        monkeypatch.setattr(ThrottledTokenObtainPairView, "throttle_classes", ())
        user = UserFactory(username="lockme")

        for _ in range(settings.AXES_FAILURE_LIMIT):
            response = api_client.post(
                TOKEN_URL,
                {"username": user.username, "password": "incorrecta"},
                format="json",
            )
            assert response.status_code == 401

        # Aunque ahora se use la contraseña correcta, axes ya bloqueó el usuario.
        response = api_client.post(
            TOKEN_URL,
            {"username": user.username, "password": "testpass123"},
            format="json",
        )
        assert response.status_code == 401


@pytest.mark.django_db
class TestJwtLogoutBlacklist:
    def test_blacklisted_refresh_token_cannot_be_reused(self, api_client, settings):
        settings.AXES_FAILURE_LIMIT = 1000
        user = UserFactory(username="logoutuser")

        login = api_client.post(
            TOKEN_URL,
            {"username": user.username, "password": "testpass123"},
            format="json",
        )
        assert login.status_code == 200
        refresh_token = login.json()["refresh"]

        logout = api_client.post(BLACKLIST_URL, {"refresh": refresh_token}, format="json")
        assert logout.status_code == 200

        reuse = api_client.post(REFRESH_URL, {"refresh": refresh_token}, format="json")
        assert reuse.status_code == 401


@pytest.mark.django_db
class TestSecurityHeaders:
    def test_response_includes_content_security_policy(self, auth_client, user):
        client = auth_client(user)

        response = client.get(ME_URL)

        assert response.status_code == 200
        assert "Content-Security-Policy" in response.headers
        assert "default-src 'self'" in response.headers["Content-Security-Policy"]
