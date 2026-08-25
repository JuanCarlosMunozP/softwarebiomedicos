"""Validación de archivos subidos por la API (tamaño, extensión y magic
bytes), reutilizable entre serializers.

El módulo de equipos tenía 5 `FileField` sin ningún tipo de validación
(cualquier usuario autenticado podía subir un archivo de cualquier tipo y
tamaño ilimitado). `MaintenanceRecord.pdf_file` sí validaba tamaño + magic
bytes, pero solo para PDF; acá generalizamos ese mismo criterio a los demás
campos, que aceptan varios tipos de archivo distintos según su propósito
(certificados, adjuntos, evidencias de orden de trabajo, etc.).
"""
from dataclasses import dataclass

from django.utils.translation import gettext_lazy as _
from rest_framework import serializers


@dataclass(frozen=True)
class _FileRule:
    max_bytes: int
    # Firmas conocidas del formato. None cuando el formato no tiene un
    # magic-byte simple y fiable de validar (p. ej. contenedores mp4/m4a).
    signatures: tuple[bytes, ...] | None


_MB = 1024 * 1024

FILE_EXTENSION_RULES: dict[str, _FileRule] = {
    "pdf": _FileRule(10 * _MB, (b"%PDF-",)),
    "doc": _FileRule(10 * _MB, (b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1",)),
    "docx": _FileRule(10 * _MB, (b"PK\x03\x04",)),
    "jpg": _FileRule(8 * _MB, (b"\xff\xd8\xff",)),
    "jpeg": _FileRule(8 * _MB, (b"\xff\xd8\xff",)),
    "png": _FileRule(8 * _MB, (b"\x89PNG\r\n\x1a\n",)),
    "mp3": _FileRule(20 * _MB, (b"ID3", b"\xff\xfb", b"\xff\xf3", b"\xff\xf2")),
    "wav": _FileRule(20 * _MB, (b"RIFF",)),
    "m4a": _FileRule(20 * _MB, None),
    "mp4": _FileRule(60 * _MB, None),
}

DOCUMENT_EXTENSIONS = frozenset({"pdf"})
CERTIFICATE_EXTENSIONS = frozenset({"pdf", "jpg", "jpeg", "png"})
ATTACHMENT_EXTENSIONS = frozenset({"pdf", "doc", "docx", "jpg", "jpeg", "png"})
EVIDENCE_EXTENSIONS = frozenset(
    {"jpg", "jpeg", "png", "pdf", "doc", "docx", "mp3", "wav", "m4a", "mp4"}
)


def validate_uploaded_file(value, *, allowed_extensions: frozenset[str]):
    """Valida tamaño, extensión y (cuando el formato lo permite) los magic
    bytes de un archivo subido. Pensado para usarse desde un método
    `validate_<campo>` de un `ModelSerializer`."""
    if not value:
        return value

    name = value.name or ""
    ext = name.rsplit(".", 1)[-1].lower() if "." in name else ""

    if ext not in allowed_extensions or ext not in FILE_EXTENSION_RULES:
        raise serializers.ValidationError(
            _("Extensión no permitida. Formatos válidos: %(exts)s.")
            % {"exts": ", ".join(sorted(allowed_extensions))}
        )

    rule = FILE_EXTENSION_RULES[ext]

    if value.size > rule.max_bytes:
        raise serializers.ValidationError(
            _("El archivo no puede superar los %(mb)s MB.")
            % {"mb": rule.max_bytes // _MB}
        )

    if rule.signatures:
        header = value.read(max(len(sig) for sig in rule.signatures))
        value.seek(0)
        if not any(header.startswith(sig) for sig in rule.signatures):
            raise serializers.ValidationError(
                _("El contenido del archivo no coincide con la extensión .%(ext)s.")
                % {"ext": ext}
            )

    return value
