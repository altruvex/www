"""Load and validate config/font.yaml."""
from __future__ import annotations

from pathlib import Path
from typing import Literal

import yaml
from pydantic import BaseModel, ConfigDict, model_validator

ROOT = Path(__file__).resolve().parent.parent
CONFIG_PATH = ROOT / "config" / "font.yaml"
SOURCES_DIR = ROOT / "sources"


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)


class SourceFile(Strict):
    filename: str
    url: str
    sha256: str


class Source(Strict):
    version: str
    upstream_repository: str
    upstream_commit: str
    files: dict[Literal["font", "italic", "license"], SourceFile]

    def path(self, key: str, kind: str) -> Path:
        return SOURCES_DIR / key / self.files[kind].filename


class Scale(Strict):
    k: float
    source_upm: int
    output_upm: int
    rounding_tolerance_units: float
    ascent_policy: Literal["source_times_k"]
    descent_policy: Literal["source_times_k"]
    line_gap_policy: Literal["source_times_k"]


class Family(Strict):
    source: str
    family: str
    postscript: str
    output: str
    unicodes: list[str] | None
    required_unicodes: list[str]
    scale: Scale | None
    # null = every layout feature the source has; a list keeps only those (the subsetter then drops
    # the glyphs only the others reach). Size, not taste: Inter's full GSUB more than doubles the file.
    layout_features: list[str] | None = None


class Weight(Strict):
    candidates: list[int]
    chosen: int | None


class BudgetValues(Strict):
    latin_woff2_kb: float | None
    arabic_woff2_kb: float | None
    initial_route_font_kb: dict[Literal["en", "ar"], float | None]


class Budgets(BudgetValues):
    """The top-level values are the budgets; with `enforced: true` every one must be set and
    tests/test_font_loading.py fails when dist/payload-report.json exceeds any of them.
    `baseline` is what tools/payload.py measured and `proposed` + `proposed_rule` record how the
    budgets were derived (approved by Ali 2026-09-30)."""
    enforced: bool = False
    baseline: BudgetValues | None = None
    baseline_source: str | None = None
    proposed: BudgetValues | None = None
    proposed_rule: str | None = None

    @model_validator(mode="after")
    def _enforced_needs_values(self) -> "Budgets":
        if self.enforced:
            vals = [self.latin_woff2_kb, self.arabic_woff2_kb,
                    self.initial_route_font_kb.get("en"), self.initial_route_font_kb.get("ar")]
            if any(v is None for v in vals):
                raise ValueError("budgets.enforced is true but a budget is null")
        return self


class LineHeight(Strict):
    heading_ar: float
    vocalised: float
    display_latin: float


class Caps(Strict):
    from_px: int
    lever: Literal["word_spacing", "letter_spacing"]


class Spacing(Strict):
    # [font size px, font weight, letter-spacing em, source] as apps/www ships it
    ladder_anchors: list[tuple[int, int, float, str]]
    sizes: list[int]
    caps: Caps
    weights: list[int]
    weight_model: Literal["sidebearing", "rhythm"]
    bucket_gap_fraction: float
    arabic_tracking_em: float
    line_height: LineHeight


class Copy(Strict):
    """Live copy, read from apps/www/messages/<locale>/<namespace>.json; keys joined by a space."""
    namespace: str
    keys: list[str]


class PairingRow(Strict):
    role: str
    px: int
    weight: int
    text: Copy
    source: str


class WeightRange(Strict):
    start: int
    stop: int
    step: int


class Pairing(Strict):
    hero: PairingRow
    ar_weights: WeightRange
    references: list[PairingRow]
    engines: list[str]


class Build(Strict):
    version: str
    timestamp: str


class BarWidening(Strict):
    percent: float


class Config(Strict):
    build: Build
    bar_widening: BarWidening | None = None
    sources: dict[str, Source]
    families: dict[Literal["latin", "arabic"], Family]
    weights: dict[str, Weight]
    budgets: Budgets
    spacing: Spacing
    pairing: Pairing


def load(path: Path = CONFIG_PATH) -> Config:
    cfg = Config.model_validate(yaml.safe_load(path.read_text()))
    for name, fam in cfg.families.items():
        if fam.source not in cfg.sources:
            raise ValueError(f"family {name}: unknown source {fam.source!r}")
        if fam.scale and fam.scale.source_upm * fam.scale.k != int(fam.scale.source_upm * fam.scale.k):
            raise ValueError(f"family {name}: source_upm x k must be an integer so k stays exact")
    return cfg
