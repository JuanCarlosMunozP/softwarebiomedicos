"""Paquete Django del proyecto: URLs (/admin/, /api/v1/, OpenAPI),
ASGI/WSGI, Celery y settings (base/dev/prod). En DEBUG sirve media;
en producción el estático/media lo entrega S3 o el reverse-proxy.
Este módulo solo expone la app Celery para que el worker arranque."""
from .celery import app as celery_app

__all__ = ("celery_app",)
