"""Glyph integrity: every output glyph must be an upstream glyph, unchanged except for the
documented scale k and its rounding. No glyph may be added, and none may go missing beyond the
explicit subset.

Output glyphs are matched to source glyphs by position: the subsetter keeps the source's relative
glyph order, so output glyph i is source glyph glyph_map[i]. A wrong match cannot pass, because its
outline would differ.
"""
from __future__ import annotations

from fontTools.ttLib import TTFont

EPS = 1e-9


def _close(out: float, src: float, k: float, tol: float) -> bool:
    return abs(out - src * k) <= tol + EPS


def _compare_glyf(sg, og, k, tol, o2s) -> str | None:
    if sg.numberOfContours != og.numberOfContours:
        return "contour count"
    if sg.numberOfContours == 0:
        return None
    if sg.isComposite():
        if len(sg.components) != len(og.components):
            return "component count"
        for sc, oc in zip(sg.components, og.components):
            if o2s.get(oc.glyphName) != sc.glyphName:
                return "component reference"
            if getattr(sc, "transform", None) != getattr(oc, "transform", None):
                return "component transform"
            if not (_close(oc.x, sc.x, k, tol) and _close(oc.y, sc.y, k, tol)):
                return "component offset"
            if sc.flags != oc.flags:
                return "component flags"
        return None
    if list(sg.endPtsOfContours) != list(og.endPtsOfContours):
        return "contour structure"
    if [f & 1 for f in sg.flags] != [f & 1 for f in og.flags]:
        return "on/off-curve flags"
    for (sx, sy), (ox, oy) in zip(sg.coordinates, og.coordinates):
        if not (_close(ox, sx, k, tol) and _close(oy, sy, k, tol)):
            return "outline coordinates"
    return None


def _compare_gvar(sv, ov, k, tol) -> str | None:
    if len(sv) != len(ov):
        return "gvar tuple count"
    for s, o in zip(sv, ov):
        if s.axes != o.axes:
            return "gvar region"
        if len(s.coordinates) != len(o.coordinates):
            return "gvar point count"
        for sd, od in zip(s.coordinates, o.coordinates):
            if (sd is None) != (od is None):
                return "gvar inferred points"
            if sd is not None and not (_close(od[0], sd[0], k, tol) and _close(od[1], sd[1], k, tol)):
                return "gvar deltas"
    return None


def compare(source: TTFont, output: TTFont, glyph_map: list[str], k: float, tol: float,
            requested: set[int] | None, edited: set[str] = frozenset()) -> dict:
    """Compare output against source. glyph_map[i] is the source name of output glyph i.

    requested: the explicit subset's codepoints, or None when the whole font is kept.
    edited: glyphs changed on purpose (tools/glyph_edits.py); they are listed, not counted as
    tampering.
    """
    out_order = output.getGlyphOrder()
    src_order = source.getGlyphOrder()
    o2s = dict(zip(out_order, glyph_map))
    added = max(0, len(out_order) - len(glyph_map))
    unknown = [g for g in glyph_map if g not in source["glyf"]]

    src_cmap, out_cmap = source.getBestCmap(), output.getBestCmap()
    wanted = set(src_cmap) if requested is None else {c for c in requested if c in src_cmap}
    not_in_source = sorted(c for c in (requested or ()) if c not in src_cmap)
    kept = set(glyph_map)
    # Deleted beyond the subset: a glyph a requested codepoint maps to must survive.
    deleted = sorted({src_cmap[c] for c in wanted} - kept)
    if requested is None:
        deleted = sorted(set(src_order) - kept)
    cmap_errors = [f"U+{c:04X}" for c in sorted(set(out_cmap) | wanted)
                   if c not in out_cmap or c not in wanted or o2s.get(out_cmap[c]) != src_cmap[c]]

    modified: list[dict] = []
    intended: list[str] = []
    sg_, og_ = source["glyf"], output["glyf"]
    sv_ = source["gvar"].variations if "gvar" in source else {}
    ov_ = output["gvar"].variations if "gvar" in output else {}
    for on, sn in zip(out_order, glyph_map):
        if sn not in sg_:
            continue
        why = _compare_glyf(sg_[sn], og_[on], k, tol, o2s)
        if not why:
            why = _compare_gvar(sv_.get(sn, []), ov_.get(on, []), k, tol)
        if not why:
            sa, sl = source["hmtx"][sn]
            oa, ol = output["hmtx"][on]
            if not _close(oa, sa, k, tol):
                why = "advance width"
        if why and sn in edited:
            intended.append(sn)
        elif why:
            modified.append({"glyph": sn, "reason": why})

    return {
        "source_glyphs": len(src_order),
        "preserved": len(glyph_map) - len(modified) - len(intended) - len(unknown),
        "added": added + len(unknown),
        "modified": len(modified),
        "edited_on_purpose": sorted(intended),
        "deleted_outside_subset": deleted,
        # Codepoints inside the configured ranges that Vazirmatn does not have: skipped, never drawn.
        "requested_not_in_source_count": len(not_in_source),
        "cmap_errors": cmap_errors,
        "modified_detail": modified[:50],
        "scale_k": k,
        "tolerance_units": tol,
        "ok": not (added or unknown or modified or deleted or cmap_errors),
    }
