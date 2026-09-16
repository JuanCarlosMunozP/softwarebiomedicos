"""
URLConf raíz del proyecto.

Las rutas de la API se versionan bajo /api/v1/. Cada app de dominio
registra sus rutas en `api/v1/urls.py`.
"""
from urllib.parse import urlparse, urlunparse

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.shortcuts import redirect
from django.urls import include, path, re_path
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)

_LOOPBACK = {"localhost", "127.0.0.1", "0.0.0.0"}


def redirect_to_frontend_home(request, leftover=None):
    """/admin apunta a la HomePage pública del frontend, no al admin de Django."""
    parsed = urlparse(settings.FRONTEND_BASE_URL)
    request_host = request.get_host().split(":")[0]
    frontend_host = (parsed.hostname or "").lower()
    if request_host.lower() in _LOOPBACK and frontend_host in _LOOPBACK:
        netloc = f"{request_host}:{parsed.port}" if parsed.port else request_host
        return redirect(urlunparse((parsed.scheme or "http", netloc, "/", "", "", "")))
    return redirect(settings.FRONTEND_BASE_URL.rstrip("/") + "/")


urlpatterns = [
    re_path(r"^admin(/.*)?$", redirect_to_frontend_home),
    path("django-admin/", admin.site.urls),
    # API v1 (las rutas de cada app se irán incluyendo a medida que se creen)
    path("api/v1/", include("api.v1.urls")),
    # OpenAPI / Swagger
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path(
        "api/docs/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),
    path(
        "api/redoc/",
        SpectacularRedocView.as_view(url_name="schema"),
        name="redoc",
    ),
]

if settings.DEBUG:
    # Servir archivos subidos por FileSystemStorage durante el desarrollo.
    # En prod se usa S3 o un reverse-proxy que sirve /media directamente.
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    if "debug_toolbar" in settings.INSTALLED_APPS:
        urlpatterns += [path("__debug__/", include("debug_toolbar.urls"))]
