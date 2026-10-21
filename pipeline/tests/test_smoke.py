"""Prueba de humo: el entorno del pipeline tiene todas las dependencias de la spec (sección 11)."""
import importlib

import pytest

MODULES = ["numpy", "spiceypy", "rasterio", "pyproj", "pandas", "pydantic", "matplotlib", "pipeline"]


@pytest.mark.parametrize("name", MODULES)
def test_import(name):
    assert importlib.import_module(name) is not None


def test_cspice_toolkit_available():
    import spiceypy

    assert spiceypy.tkvrsn("TOOLKIT").startswith("CSPICE")
