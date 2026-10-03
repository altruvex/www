"""OFL / Reserved Font Name checks, run against the pinned upstream files on every build."""
from __future__ import annotations

import re

from fontTools.ttLib import TTFont

# Name IDs a derivative must not fill with a Reserved Font Name (OFL condition 3).
CHECKED_NAME_IDS = (1, 2, 3, 4, 6, 16, 17, 25)
# Upstream records that can carry licence or provenance statements.
PROVENANCE_NAME_IDS = (0, 10, 13)
OTHER_LICENCE = re.compile(r"Apache|Bitstream|GPL|MIT License|Creative Commons|public domain", re.I)
RFN = re.compile(r'Reserved\s+Font\s+Names?\s*:?\s*(.+)', re.I)


def _names(font: TTFont, ids) -> dict[int, list[str]]:
    out: dict[int, list[str]] = {}
    for r in font["name"].names:
        if r.nameID in ids:
            out.setdefault(r.nameID, []).append(r.toUnicode())
    return {k: sorted(set(v)) for k, v in sorted(out.items())}


def _split_rfn(text: str) -> list[str]:
    return [n.strip(" .\"'“”") for n in re.split(r',|\band\b', text) if n.strip(" .\"'“”")]


def declared_rfns(ofl_text: str, font: TTFont) -> list[str]:
    """Reserved Font Names declared in the OFL header or in the font's copyright/licence records.

    Only the header counts: the OFL body uses the phrase "Reserved Font Name" generically.
    """
    header = ofl_text.split("This Font Software is licensed under", 1)[0]
    found = [n for m in RFN.finditer(header) for n in _split_rfn(m.group(1))]
    for texts in _names(font, (0, 13)).values():
        for t in texts:
            if "reserved font name" in t.lower() and "no modified version" not in t.lower():
                found += [n for m in RFN.finditer(t) for n in _split_rfn(m.group(1))]
    return sorted(set(found))


def check(ofl_text: str, upstream: TTFont, derivative: TTFont) -> dict:
    """Return a report; report["ok"] is False if the derivative uses a declared RFN or keeps the
    upstream family name in an identifying record."""
    rfns = declared_rfns(ofl_text, upstream)
    upstream_family = _names(upstream, (16,)).get(16) or _names(upstream, (1,))[1]
    upstream_family = upstream_family[0].split()[0]  # "Outfit Thin" -> "Outfit"
    new = _names(derivative, CHECKED_NAME_IDS)
    violations = [
        {"nameID": i, "value": v, "rfn": r}
        for i, vals in new.items() for v in vals for r in rfns if r.lower() in v.lower()
    ]
    leftover = [{"nameID": i, "value": v} for i, vals in new.items() for v in vals
                if upstream_family.lower() in v.lower()]
    notes = [{"nameID": i, "text": t} for i, vals in _names(upstream, PROVENANCE_NAME_IDS).items()
             for t in vals if OTHER_LICENCE.search(t)]
    return {
        "ofl_1_1": "SIL Open Font License, Version 1.1" in ofl_text,
        "declared_rfns": rfns,
        "rfn_violations": violations,
        "upstream_family_left_in_names": leftover,
        "derivative_names": {str(k): v for k, v in new.items()},
        "provenance_notes": notes,
        "ok": "SIL Open Font License, Version 1.1" in ofl_text and not violations and not leftover,
    }
