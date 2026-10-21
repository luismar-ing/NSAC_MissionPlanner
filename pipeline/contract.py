"""Contrato de datos v1 (docs/DATA_CONTRACT.md) como modelos pydantic.

Cada modelo valida un archivo aislado. Las comprobaciones entre archivos
(sección 14 del contrato) están en pipeline/validate.py.
"""

from __future__ import annotations

import re
from datetime import datetime, timedelta, timezone
from typing import Annotated, Literal

import numpy as np
from pydantic import AfterValidator, BaseModel, ConfigDict, Field, RootModel, model_validator

CONTRACT_VERSION = "1.0.0"

INSTANT_RE = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$")
DAY_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
SITE_ID_RE = r"^[a-z0-9_]+$"
NORM_TOL = 1e-6


# ---------------------------------------------------------------- tiempo


def parse_instant(s: str) -> datetime:
    """'2027-01-01T00:00:00Z' -> datetime UTC."""
    return datetime.strptime(s, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)


def parse_day(s: str) -> datetime:
    """'2027-01-01' -> datetime UTC a las 00:00."""
    return datetime.strptime(s, "%Y-%m-%d").replace(tzinfo=timezone.utc)


def format_instant(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _check_instant(s: str) -> str:
    if not INSTANT_RE.match(s):
        raise ValueError(f"instante no ISO 8601 UTC 'YYYY-MM-DDTHH:MM:SSZ': {s!r}")
    parse_instant(s)  # fecha imposible -> ValueError
    return s


def _check_day(s: str) -> str:
    if not DAY_RE.match(s):
        raise ValueError(f"día no 'YYYY-MM-DD': {s!r}")
    parse_day(s)
    return s


Instant = Annotated[str, AfterValidator(_check_instant)]
Day = Annotated[str, AfterValidator(_check_day)]
SiteId = Annotated[str, Field(pattern=SITE_ID_RE)]
NonEmpty = Annotated[str, Field(min_length=1)]
Lat = Annotated[float, Field(ge=-90, le=90)]
Lon = Annotated[float, Field(ge=-180, lt=180)]
Pct = Annotated[float, Field(ge=0, le=100)]
HoursOfDay = Annotated[float, Field(ge=0, le=24)]


class Model(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)


def _array(values, name: str, shape_tail: tuple[int, ...] = ()) -> np.ndarray:
    arr = np.asarray(values, dtype=float)
    if arr.ndim != 1 + len(shape_tail) or (shape_tail and arr.shape[1:] != shape_tail):
        raise ValueError(f"{name}: forma {arr.shape}, se esperaba (n, {', '.join(map(str, shape_tail))})")
    return arr


# ---------------------------------------------------------------- manifest


class DateRange(Model):
    arrival_start: Day
    arrival_end: Day
    timeseries_start_utc: Instant
    timeseries_end_utc: Instant
    scene_start_utc: Instant
    scene_end_utc: Instant

    @model_validator(mode="after")
    def _order(self):
        if parse_day(self.arrival_start) > parse_day(self.arrival_end):
            raise ValueError("arrival_start posterior a arrival_end")
        if parse_instant(self.timeseries_start_utc) >= parse_instant(self.timeseries_end_utc):
            raise ValueError("rango de series vacío o invertido")
        if parse_instant(self.scene_start_utc) >= parse_instant(self.scene_end_utc):
            raise ValueError("rango de escena vacío o invertido")
        return self


class HorizonParams(Model):
    az_step_deg: Annotated[float, Field(gt=0, le=360)]
    r_max_km: Annotated[float, Field(gt=0)]
    clip_negative: bool


class ScoreWeights(Model):
    w1: Annotated[float, Field(ge=0)]
    w2: Annotated[float, Field(ge=0)]
    w3: Annotated[float, Field(ge=0)]


class Params(Model):
    step_min: Annotated[int, Field(gt=0)]
    h_obs_m: Annotated[float, Field(gt=0)]
    antenna_margin_deg: Annotated[float, Field(ge=0)]
    sun_criterion: Literal["upper_limb", "disk_fraction"]
    sun_radius_deg: Annotated[float, Field(gt=0)]
    sun_fraction_threshold: Annotated[float, Field(gt=0, lt=1)] | None
    horizon: HorizonParams
    window_days: Annotated[list[Annotated[int, Field(gt=0)]], Field(min_length=1)]
    transit_days: Annotated[float, Field(gt=0)]
    score_weights: ScoreWeights
    trajectory_mode: Literal["REAL", "ILLUSTRATIVE"]
    scale_mode: NonEmpty
    moon_frame: Literal["MOON_ME", "MOON_PA"]
    scene_frame: NonEmpty
    spice_kernels: list[NonEmpty]
    dem_product: NonEmpty | None

    @model_validator(mode="after")
    def _consistency(self):
        if (self.sun_criterion == "disk_fraction") != (self.sun_fraction_threshold is not None):
            raise ValueError("sun_fraction_threshold es obligatorio con disk_fraction y null con upper_limb")
        if len(set(self.window_days)) != len(self.window_days):
            raise ValueError("window_days repetidos")
        bins = 360 / self.horizon.az_step_deg
        if abs(bins - round(bins)) > 1e-9:
            raise ValueError("360 no es múltiplo de horizon.az_step_deg")
        return self


class FileInfo(Model):
    bytes: Annotated[int, Field(ge=0)]
    sha256: Annotated[str, Field(pattern=r"^[0-9a-f]{64}$")]


class Manifest(Model):
    contract_version: Annotated[str, Field(pattern=r"^\d+\.\d+\.\d+$")]
    data_version: NonEmpty
    generated_utc: Instant
    data_status: Literal["REAL", "SYNTHETIC"]
    date_range: DateRange
    params: Params
    sites: Annotated[list[SiteId], Field(min_length=1)]
    files: dict[str, FileInfo] | None = None

    @model_validator(mode="after")
    def _ranges(self):
        dr, p = self.date_range, self.params
        a0, a1 = parse_day(dr.arrival_start), parse_day(dr.arrival_end)
        if parse_instant(dr.timeseries_start_utc) != a0:
            raise ValueError("timeseries_start_utc debe ser arrival_start a las 00:00Z (contrato §2)")
        expected_end = a1 + timedelta(days=1 + max(p.window_days))
        if parse_instant(dr.timeseries_end_utc) != expected_end:
            raise ValueError(f"timeseries_end_utc debe ser {format_instant(expected_end)} (contrato §2)")
        if parse_instant(dr.scene_start_utc) > a0 - timedelta(days=p.transit_days):
            raise ValueError("la escena no cubre el primer despegue (contrato §2)")
        if parse_instant(dr.scene_end_utc) < expected_end:
            raise ValueError("la escena no cubre el final de las series (contrato §2)")
        if len(set(self.sites)) != len(self.sites):
            raise ValueError("sites repetidos")
        return self


# ---------------------------------------------------------------- sitios y planes


class Site(Model):
    id: SiteId
    name: NonEmpty
    lat: Lat
    lon: Lon
    elevation_m: float
    source: NonEmpty


class Sites(RootModel[Annotated[list[Site], Field(min_length=1)]]):
    @model_validator(mode="after")
    def _unique(self):
        ids = [s.id for s in self.root]
        if len(set(ids)) != len(ids):
            raise ValueError("ids de sitio repetidos")
        return self


class Plan(Model):
    id: NonEmpty
    site_id: SiteId
    arrival_utc: Instant
    window_days: Annotated[int, Field(gt=0)]
    transit_days: Annotated[float, Field(gt=0)]
    launch_utc: Instant
    trajectory_id: NonEmpty

    @model_validator(mode="after")
    def _derived(self):
        arrival = parse_instant(self.arrival_utc)
        if (arrival.hour, arrival.minute, arrival.second) != (0, 0, 0):
            raise ValueError("arrival_utc debe ser las 00:00:00Z del día de llegada")
        launch = arrival - timedelta(days=self.transit_days)
        if abs((parse_instant(self.launch_utc) - launch).total_seconds()) > 1:
            raise ValueError(f"launch_utc debe ser arrival_utc - transit_days = {format_instant(launch)}")
        stamp = arrival.strftime("%Y%m%d")
        if self.id != f"{self.site_id}_{stamp}_{self.window_days}d":
            raise ValueError(f"id debe ser {self.site_id}_{stamp}_{self.window_days}d")
        if self.trajectory_id != f"{self.site_id}_{stamp}":
            raise ValueError(f"trajectory_id debe ser {self.site_id}_{stamp}")
        return self


class Plans(RootModel[Annotated[list[Plan], Field(min_length=1)]]):
    @model_validator(mode="after")
    def _unique(self):
        ids = [p.id for p in self.root]
        if len(set(ids)) != len(ids):
            raise ValueError("ids de plan repetidos")
        return self


# ---------------------------------------------------------------- series del sitio


class Horizon(Model):
    site_id: SiteId
    az_step_deg: Annotated[float, Field(gt=0, le=360)]
    h_obs_m: Annotated[float, Field(gt=0)]
    r_max_km: Annotated[float, Field(gt=0)]
    elev_deg: list[float]

    @model_validator(mode="after")
    def _shape(self):
        n = round(360 / self.az_step_deg)
        if len(self.elev_deg) != n:
            raise ValueError(f"elev_deg tiene {len(self.elev_deg)} valores, se esperaban {n}")
        e = np.asarray(self.elev_deg, dtype=float)
        if not np.all(np.isfinite(e)) or np.any(np.abs(e) > 90):
            raise ValueError("elev_deg fuera de [-90, 90]")
        return self


class Timeseries(Model):
    site_id: SiteId
    start_utc: Instant
    step_min: Annotated[int, Field(gt=0)]
    n: Annotated[int, Field(gt=0)]
    angle_scale: Annotated[float, Field(gt=0)]
    sun_az: list[int]
    sun_el: list[int]
    earth_az: list[int]
    earth_el: list[int]
    sun_vis: list[int]
    earth_vis: list[int]

    @model_validator(mode="after")
    def _arrays(self):
        for name in ("sun_az", "sun_el", "earth_az", "earth_el", "sun_vis", "earth_vis"):
            if len(getattr(self, name)) != self.n:
                raise ValueError(f"{name} tiene {len(getattr(self, name))} valores, se esperaban n = {self.n}")
        s = self.angle_scale
        for name in ("sun_az", "earth_az"):
            a = np.asarray(getattr(self, name)) * s
            if np.any(a < 0) or np.any(a >= 360):
                raise ValueError(f"{name} fuera de [0, 360) grados")
        for name in ("sun_el", "earth_el"):
            a = np.asarray(getattr(self, name)) * s
            if np.any(np.abs(a) > 90):
                raise ValueError(f"{name} fuera de [-90, 90] grados")
        for name in ("sun_vis", "earth_vis"):
            if not set(getattr(self, name)) <= {0, 1}:
                raise ValueError(f"{name} solo admite 0 o 1")
        return self


class DayRow(Model):
    date: Day
    sun_pct: Pct
    earth_h: HoursOfDay
    longest_dark_h: HoursOfDay
    longest_comm_gap_h: HoursOfDay


class Daily(Model):
    site_id: SiteId
    days: Annotated[list[DayRow], Field(min_length=1)]

    @model_validator(mode="after")
    def _consecutive(self):
        d = [parse_day(r.date) for r in self.days]
        for a, b in zip(d, d[1:]):
            if b - a != timedelta(days=1):
                raise ValueError(f"días no consecutivos: {a:%Y-%m-%d} -> {b:%Y-%m-%d}")
        return self


class WindowRow(Model):
    start: Instant
    sun_pct: Pct
    longest_dark_h: Annotated[float, Field(ge=0)]
    earth_h_min: HoursOfDay
    earth_h_mean: HoursOfDay
    longest_comm_gap_h: Annotated[float, Field(ge=0)]
    score: Annotated[float, Field(ge=0, le=1)]


class Windows(Model):
    site_id: SiteId
    window_days: Annotated[int, Field(gt=0)]
    rows: Annotated[list[WindowRow], Field(min_length=1)]

    @model_validator(mode="after")
    def _rows(self):
        limit = 24 * self.window_days
        starts = [parse_instant(r.start) for r in self.rows]
        for t in starts:
            if (t.hour, t.minute, t.second) != (0, 0, 0):
                raise ValueError("cada start debe ser las 00:00:00Z")
        for a, b in zip(starts, starts[1:]):
            if b - a != timedelta(days=1):
                raise ValueError(f"filas no consecutivas: {format_instant(a)} -> {format_instant(b)}")
        for r in self.rows:
            if r.longest_dark_h > limit or r.longest_comm_gap_h > limit:
                raise ValueError(f"racha mayor que la ventana ({limit} h) en {r.start}")
            if r.earth_h_min > r.earth_h_mean + 1e-9:
                raise ValueError(f"earth_h_min > earth_h_mean en {r.start}")
        return self


# ---------------------------------------------------------------- escena y trayectoria


def _check_unit(arr: np.ndarray, name: str) -> None:
    norms = np.linalg.norm(arr, axis=1)
    if np.any(np.abs(norms - 1) > NORM_TOL):
        raise ValueError(f"{name} no normalizado (norma fuera de 1 ± {NORM_TOL})")


class SceneEphemeris(Model):
    frame: NonEmpty
    start_utc: Instant
    step_min: Annotated[int, Field(gt=0)]
    n: Annotated[int, Field(gt=0)]
    moon_pos_km: list[list[float]]
    sun_dir: list[list[float]]
    moon_frame: Literal["MOON_ME", "MOON_PA"]
    moon_quat: list[list[float]]
    earth_frame: NonEmpty
    earth_quat: list[list[float]]

    @model_validator(mode="after")
    def _arrays(self):
        for name, k in (("moon_pos_km", 3), ("sun_dir", 3), ("moon_quat", 4), ("earth_quat", 4)):
            arr = _array(getattr(self, name), name, (k,))
            if len(arr) != self.n:
                raise ValueError(f"{name} tiene {len(arr)} muestras, se esperaban n = {self.n}")
            if not np.all(np.isfinite(arr)):
                raise ValueError(f"{name} contiene valores no finitos")
            if name != "moon_pos_km":
                _check_unit(arr, name)
        return self


class Phases(Model):
    launch_utc: Instant
    injection_utc: Instant
    lunar_arrival_utc: Instant
    landing_utc: Instant


class Trajectory(Model):
    id: NonEmpty
    site_id: SiteId
    mode: Literal["REAL", "ILLUSTRATIVE"]
    frame: NonEmpty
    t0_utc: Instant
    t_s: Annotated[list[float], Field(min_length=2)]
    pos_km: list[list[float]]
    phases: Phases

    @model_validator(mode="after")
    def _shape(self):
        t = np.asarray(self.t_s, dtype=float)
        if t[0] != 0:
            raise ValueError("t_s debe empezar en 0")
        if np.any(np.diff(t) <= 0):
            raise ValueError("t_s debe ser estrictamente creciente")
        pos = _array(self.pos_km, "pos_km", (3,))
        if len(pos) != len(t):
            raise ValueError("pos_km y t_s tienen longitudes distintas")
        t0 = parse_instant(self.t0_utc)
        ph = self.phases
        times = [parse_instant(x) for x in (ph.launch_utc, ph.injection_utc, ph.lunar_arrival_utc, ph.landing_utc)]
        if times != sorted(times):
            raise ValueError("fases fuera de orden (launch <= injection <= lunar_arrival <= landing)")
        if times[0] != t0:
            raise ValueError("t0_utc debe ser phases.launch_utc")
        if abs((times[3] - t0).total_seconds() - t[-1]) > 1:
            raise ValueError("phases.landing_utc debe coincidir con el último instante de t_s")
        if self.id != f"{self.site_id}_{times[3]:%Y%m%d}":
            raise ValueError(f"id debe ser {self.site_id}_{times[3]:%Y%m%d}")
        return self


# ---------------------------------------------------------------- características y terreno


class Attribute(Model):
    key: NonEmpty
    label: NonEmpty
    value: float | str | None
    unit: str | None
    status: Literal["available", "not available"]
    source: str | None
    method: str | None

    @model_validator(mode="after")
    def _sourced(self):
        if (self.value is None) != (self.status == "not available"):
            raise ValueError(f"{self.key}: value es null si y solo si status = 'not available'")
        if self.status == "available" and not (self.source and self.source.strip()):
            raise ValueError(f"{self.key}: un atributo disponible necesita source (regla 1, spec 5.10)")
        return self


class NearbyFeature(Model):
    name: NonEmpty
    type: Literal["crater", "ridge", "massif", "other"]
    lat: Lat
    lon: Lon
    distance_km: Annotated[float, Field(ge=0)]
    source: NonEmpty


class SiteFeatures(Model):
    site_id: SiteId
    attributes: list[Attribute]
    nearby_features: list[NearbyFeature]

    @model_validator(mode="after")
    def _unique(self):
        keys = [a.key for a in self.attributes]
        if len(set(keys)) != len(keys):
            raise ValueError("claves de atributo repetidas")
        return self


class Origin(Model):
    lat: Lat
    lon: Lon
    elevation_m: float


class Grid(Model):
    nx: Annotated[int, Field(ge=2)]
    ny: Annotated[int, Field(ge=2)]
    spacing_m: Annotated[float, Field(gt=0)]
    x0_m: float
    y0_m: float


class TerrainHeader(Model):
    site_id: Annotated[str, Field(pattern=r"^([a-z0-9_]+|_polar)$")]
    lod: Annotated[int, Field(ge=0)]
    frame: Literal["ENU_SITE", "POLAR_STEREO"]
    origin: Origin
    projection: str | None
    grid: Grid
    height_encoding: Literal["int16"]
    height_scale_m: Annotated[float, Field(gt=0)]
    height_offset_m: float
    bin_file: Annotated[str, Field(pattern=r"^lod\d+\.bin$")]
    byte_length: Annotated[int, Field(gt=0)]

    @model_validator(mode="after")
    def _consistency(self):
        if (self.frame == "POLAR_STEREO") != (self.projection is not None):
            raise ValueError("projection es obligatorio con POLAR_STEREO y null con ENU_SITE")
        if self.bin_file != f"lod{self.lod}.bin":
            raise ValueError(f"bin_file debe ser lod{self.lod}.bin")
        if self.byte_length != self.grid.nx * self.grid.ny * 2:
            raise ValueError("byte_length debe ser nx · ny · 2")
        return self


MODELS: dict[str, type[BaseModel]] = {
    "manifest": Manifest,
    "sites": Sites,
    "plans": Plans,
    "horizon": Horizon,
    "timeseries": Timeseries,
    "daily": Daily,
    "windows": Windows,
    "scene_ephemeris": SceneEphemeris,
    "trajectory": Trajectory,
    "site_features": SiteFeatures,
    "terrain_header": TerrainHeader,
}
