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
        refresh_token = login.cookies[settings.AUTH_COOKIE_REFRESH_NAME].value
        assert refresh_token

        # El logout lee el refresh token de la cookie (el test client de
        # Django la reenvía automáticamente, igual que haría un navegador).
        logout = api_client.post(BLACKLIST_URL)
        assert logout.status_code == 204

        # Simula un atacante que interceptó el refresh token antes del
        # logout e intenta reutilizarlo directamente: debe seguir fallando
        # aunque fuerce la cookie a mano, porque el backend lo blacklisteó.
        api_client.cookies[settings.AUTH_COOKIE_REFRESH_NAME] = refresh_token
        reuse = api_client.post(REFRESH_URL)
        assert reuse.status_code == 401


@pytest.mark.django_db
class TestCookieAuth:
    def test_login_sets_httponly_cookies_and_no_tokens_in_body(self, api_client, settings):
        settings.AXES_FAILURE_LIMIT = 1000
        user = UserFactory(username="cookieuser")

        response = api_client.post(
            TOKEN_URL,
            {"username": user.username, "password": "testpass123"},
            format="json",
        )

        assert response.status_code == 200
        assert response.json() == {}
        access_cookie = response.cookies[settings.AUTH_COOKIE_ACCESS_NAME]
        refresh_cookie = response.cookies[settings.AUTH_COOKIE_REFRESH_NAME]
        assert access_cookie["httponly"]
        assert refresh_cookie["httponly"]

    def test_refresh_without_cookie_is_rejected(self, api_client):
        response = api_client.post(REFRESH_URL)
        assert response.status_code == 401

    def test_refresh_uses_cookie_and_rotates_it(self, api_client, settings):
        settings.AXES_FAILURE_LIMIT = 1000
        user = UserFactory(username="rotateuser")
        login = api_client.post(
            TOKEN_URL,
            {"username": user.username, "password": "testpass123"},
            format="json",
        )
        old_refresh = login.cookies[settings.AUTH_COOKIE_REFRESH_NAME].value

        refreshed = api_client.post(REFRESH_URL)

        assert refreshed.status_code == 200
        assert refreshed.json() == {}
        new_refresh = refreshed.cookies[settings.AUTH_COOKIE_REFRESH_NAME].value
        assert new_refresh != old_refresh


@pytest.mark.django_db
class TestSecurityHeaders:
    def test_response_includes_content_security_policy(self, auth_client, user):
        client = auth_client(user)

        response = client.get(ME_URL)

        assert response.status_code == 200
        assert "Content-Security-Policy" in response.headers
        assert "default-src 'self'" in response.headers["Content-Security-Policy"]
