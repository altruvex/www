"""HarfBuzz regression (step 25) on dist/web, shaped as a browser would with the production stacks.

Glyph identities are read from the font (cmap, GSUB result by context), never typed by name.
Mark collisions are measured by tools/shaping.py; the metric is documented there.
"""
import dataclasses
import unicodedata

import pytest
import uharfbuzz as hb

import shaping
from build import weight_pairs
from config import ROOT, load

# ArabicShaping.txt joining types for U+0620-064A (U+0621 hamza is non-joining, U+0640 join-causing).
RIGHT_JOINING = set("آأؤإاةدذرزو")
DUAL_JOINING = {chr(c) for c in range(0x0620, 0x064B)} - RIGHT_JOINING - {"ء", "ـ"}
BEH = "ب"

PUNCTUATION = "قلنا، نعم؛ هل تعرف؟ «هنا» ثم. هنا, هذا! هنا: تم"
SPACES = "    "
MIXED = (
    ("ar", "نستخدم Next.js 16 في المشروع"),
    ("ar", "راسلنا على hello@example.com اليوم"),
    ("ar", "زوروا https://example.com/ar/services?x=1 الآن"),
    ("ar", "عام 2026 وسعر ٣٫١٤ و١٬٠٠٠"),
    ("en", "We ship in العربية and English."),
)
CORPUS = (
    [("ar", t) for t in shaping.VOCALISED]
    + [("ar", PUNCTUATION), ("ar", f"أ{SPACES}ب"), ("en", f"a{SPACES}b"), ("ar", "(نص) [نص] «نص»")]
    + [("ar", "لا لأ لإ لآ بلا"), ("en", "0123456789"), ("ar", "٠١٢٣٤٥٦٧٨٩٫٬")]
    + list(MIXED)
)


def gid(key: str, ch: str) -> int:
    return shaping.hb_font(key, 400).get_nominal_glyph(ord(ch))


def at(glyphs, cluster: int) -> list[int]:
    return [g.gid for g in glyphs if g.cluster == cluster]


def font_of(text: str, lang: str) -> list[str]:
    out = [""] * len(text)
    for start, end, key, _ in shaping.itemize(text, lang):
        out[start:end] = [key] * (end - start)
    return out


@pytest.mark.parametrize("weight", shaping.WEIGHT_PAIRS)
def test_no_notdef_anywhere(weight):
    for lang, text in CORPUS:
        bad = [g for g in shaping.shape(text, lang, weight) if g.gid == 0]
        assert not bad, (text, weight, bad)


def test_every_joining_letter_takes_its_contextual_forms():
    present = [c for c in sorted(DUAL_JOINING | RIGHT_JOINING) if shaping.has("ar", c)]
    assert len(present) >= 36
    for c in present:
        isol = at(shaping.shape(c), 0)
        fina = at(shaping.shape(BEH + c), 1)
        assert len(isol) == len(fina) == 1, c
        assert fina != isol, f"{c} U+{ord(c):04X}: fina == isol"
        if c in DUAL_JOINING:
            init = at(shaping.shape(c + BEH), 0)
            medi = at(shaping.shape(BEH + c + BEH), 1)
            forms = {"isol": isol[0], "init": init[0], "medi": medi[0], "fina": fina[0]}
            assert len(set(forms.values())) == 4, f"{c} U+{ord(c):04X}: {forms}"
        else:  # right-joining: the following letter starts a new word form, the letter does not join left
            assert at(shaping.shape(c + BEH), 0) == isol, c


@pytest.mark.parametrize("alef", ["ا", "أ", "إ", "آ"])
@pytest.mark.parametrize("before", ["", BEH])
def test_lam_alef_forms_one_glyph(alef, before):
    text = before + "ل" + alef
    lam = len(before)
    glyphs = shaping.shape(text)
    assert not any(g.cluster == lam + 1 for g in glyphs), f"{text}: alef not merged into lam's cluster"
    lig = at(glyphs, lam)
    assert len(lig) == 1, (text, lig)
    assert lig[0] not in (gid("ar", "ل"), gid("ar", alef)), text


def test_marks_are_positioned_by_gpos():
    for text in shaping.VOCALISED:
        marks = [g for g in shaping.shape(text) if g.mark]
        assert marks, text
        idle = [g for g in marks if (g.x_offset, g.y_offset) == (0, 0)]
        assert not idle, (text, idle)


def test_valid_sequences_get_no_dotted_circle():
    circle = gid("ar", "◌")
    assert circle, "font has U+25CC, so HarfBuzz would insert it into a broken cluster"
    assert circle in [g.gid for g in shaping.shape("َ" + BEH)], "check cannot fire"
    for lang, text in CORPUS:
        assert circle not in [g.gid for g in shaping.shape(text, lang)], text


def test_punctuation_takes_the_first_family_that_has_it():
    fonts = font_of(PUNCTUATION, "ar")
    for ch, key in zip(PUNCTUATION, fonts):
        if ch in "،؛؟«»":
            assert key == "ar", ch
        if ch in ".,!:":
            assert key == "en" and not shaping.has("ar", ch), ch  # Arabic file lacks them: Latin fallback


def test_spaces_come_from_the_arabic_file_in_both_stacks():
    for lang, text in (("ar", f"أ{SPACES}ب"), ("en", f"a{SPACES}b")):
        glyphs = shaping.shape(text, lang)
        fonts = font_of(text, lang)
        for i, ch in enumerate(text):
            if ch not in SPACES:
                continue
            want = "ar" if lang == "ar" or not shaping.has("en", ch) else "en"
            assert fonts[i] == want, (lang, f"U+{ord(ch):04X}")
            g = [x for x in glyphs if x.cluster == i]
            assert len(g) == 1 and g[0].gid == gid(want, ch), (lang, f"U+{ord(ch):04X}")
    assert not shaping.has("en", " ") and not shaping.has("en", " ")


@pytest.mark.parametrize("pair", ["()", "[]", "«»"])
def test_brackets_mirror_in_rtl(pair):
    open_, close = pair
    text = f"{open_}نص{close}"
    glyphs = shaping.shape(text, "ar")
    assert font_of(text, "ar")[0] == "ar"
    assert unicodedata.mirrored(open_)
    assert at(glyphs, 0) == [gid("ar", close)] and at(glyphs, len(text) - 1) == [gid("ar", open_)]
    assert glyphs[0].cluster == len(text) - 1, "RTL: closing bracket is drawn first (leftmost)"
    ltr = shaping.shape(f"{open_}ab{close}", "en")
    assert at(ltr, 0) == [gid("en", open_)]


def _reads_ltr(glyphs, clusters: range) -> bool:
    """Clusters rise left to right (a ligature such as t_t merges clusters, so gaps are allowed)."""
    seen = [g.cluster for g in glyphs if g.cluster in clusters]
    return bool(seen) and seen == sorted(seen) and seen[0] == clusters.start


def test_latin_digits_use_the_latin_file():
    digits = "0123456789"
    glyphs = shaping.shape(digits, "en")
    assert [g.gid for g in glyphs] == [gid("en", d) for d in digits]
    assert not any(shaping.has("ar", d) for d in digits)
    text = "عام 2026"  # inside Arabic: Latin fallback, still left-to-right
    assert set(font_of(text, "ar")[4:]) == {"en"}
    assert _reads_ltr(shaping.shape(text, "ar"), range(4, 8))


def test_arabic_indic_digits_and_separators_use_the_arabic_file():
    text = "٠١٢٣٤٥٦٧٨٩٫٬"
    glyphs = shaping.shape(text, "ar")
    assert set(font_of(text, "ar")) == {"ar"}
    assert len({g.gid for g in glyphs}) == len(text)
    assert _reads_ltr(glyphs, range(len(text))), "numbers are an LTR level inside RTL"


@pytest.mark.parametrize("lang,text", MIXED)
def test_mixed_script_strings(lang, text):
    glyphs = shaping.shape(text, lang)
    fonts = font_of(text, lang)
    for i, ch in enumerate(text):
        if "؀" <= ch <= "ۿ":
            assert fonts[i] == "ar", (text, i)
        elif ch.isascii() and ch.isalnum():
            assert fonts[i] == "en", (text, i)
    # Every maximal Latin/number stretch reads left to right, whatever the paragraph direction.
    i = 0
    while i < len(text):
        if text[i].isascii() and text[i].isalnum():
            j = i
            while j < len(text) and text[j].isascii() and not text[j].isspace():
                j += 1
            assert _reads_ltr(glyphs, range(i, j)), (text, text[i:j])
            i = j
        i += 1
    # Every Arabic word reads right to left, in either paragraph direction.
    for word in text.split(" "):
        if word and all("\u0621" <= ch <= "\u064a" for ch in word):
            start = text.index(word)
            seen = [g.cluster for g in glyphs if start <= g.cluster < start + len(word)]
            assert seen == sorted(seen, reverse=True) and seen[-1] == start, (text, word)
    # Arabic joins across the Latin run: a letter before a space still gets its word-final form.
    if lang == "ar":
        first = text.split(" ")[0]
        assert at(glyphs, len(first) - 1) == at(shaping.shape(first), len(first) - 1)


@pytest.mark.parametrize("requested,drawn", [p for p in weight_pairs(load().weights) if p[0] != p[1]])
def test_arabic_avar_maps_requested_weight_to_drawn(requested, drawn):
    """Requesting 600/700 from the built file lands on the same design coordinate as Vazirmatn at
    675/830, and draws the same outline (x k)."""
    src = hb.Font(hb.Face(hb.Blob.from_file_path(str(ROOT / "sources/vazirmatn/Vazirmatn[wght].ttf"))))
    src.set_variations({"wght": drawn})
    built = shaping.hb_font("ar", requested)
    assert built.get_var_coords_normalized()[0] == pytest.approx(src.get_var_coords_normalized()[0], abs=2 / 16384)
    assert built.get_var_coords_normalized()[0] != pytest.approx(shaping.hb_font("ar", drawn).get_var_coords_normalized()[0])
    k = load().families["arabic"].scale.k
    for ch in ("ب", "م", "ه"):
        a = built.get_glyph_extents(built.get_nominal_glyph(ord(ch)))
        b = src.get_glyph_extents(src.get_nominal_glyph(ord(ch)))
        assert (a.width, a.height) == pytest.approx((b.width * k, b.height * k), abs=2), ch


def test_collision_metric_detects_a_forced_collision():
    """Sanity: the same kasra, moved so its ink centre sits on the beh's ink centre, must register."""
    text = BEH + "\u0650"
    glyphs = shaping.shape(text)
    assert shaping.overlaps(text, glyphs, 400)[0]["overlap_em"] < shaping.TARGET_EM
    font, upem = shaping.hb_font("ar", 400), shaping.face("ar").upem

    def centre(g):
        e = font.get_glyph_extents(g.gid)
        return (g.x + (e.x_bearing + e.width / 2) / upem, g.y + (e.y_bearing + e.height / 2) / upem)

    (mark,) = [g for g in glyphs if g.mark]
    (base,) = [g for g in glyphs if not g.mark]
    (mx, my), (bx, by) = centre(mark), centre(base)
    moved = [dataclasses.replace(g, x=g.x + bx - mx, y=g.y + by - my) if g.mark else g for g in glyphs]
    assert shaping.overlaps(text, moved, 400)[0]["overlap_em"] >= shaping.TARGET_EM


@pytest.fixture(scope="module")
def report():
    return shaping.collect()


@pytest.mark.parametrize("weight", shaping.WEIGHT_PAIRS)
def test_mark_collisions_under_target(report, weight):
    p = report["pairs"][str(weight)]
    assert p["marks"] > 0
    assert p["notdef"] == 0
    assert not p["over_target"], p["over_target"]
    assert p["max_overlap_em"] < shaping.TARGET_EM
