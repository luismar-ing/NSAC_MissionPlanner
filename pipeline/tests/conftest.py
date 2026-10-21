"""Configuración común de pytest para el pipeline."""

import sys

# En Windows la consola usa cp1252; las pruebas imprimen símbolos (°, ±, −) como evidencia.
for stream in (sys.stdout, sys.stderr):
    if hasattr(stream, "reconfigure"):
        stream.reconfigure(encoding="utf-8")
