"""Prototype build of Altruvex Sans test fonts (not production)."""
from fontTools.ttLib import TTFont
from fontTools.ttLib.scaleUpem import scale_upem
from fontTools import subset
import sys
OUT=sys.argv[1]
def rename(t, family, ps):
    n=t["name"]
    cp=str(n.getName(0,3,1,0x409))
    for rec in list(n.names):
        if rec.nameID in (1,2,3,4,6,16,17,25): n.removeNames(nameID=rec.nameID)
    n.setName(cp+"; Modifications Copyright 2026 Altruvex",0,3,1,0x409)
    n.setName(family,1,3,1,0x409); n.setName("Regular",2,3,1,0x409)
    n.setName(f"0.1;ALTRUVEX;{ps}",3,3,1,0x409); n.setName(family,4,3,1,0x409)
    n.setName(ps,6,3,1,0x409); n.setName(ps,25,3,1,0x409)
    # fvar instance names keep pointing at STAT/name ids >255, left as-is
def remap_wght(t, pairs):
    """Compose a user-space weight remap (requested -> drawn) into the font's existing avar.
    pairs: [(user, drawn), ...] including the axis min/default/max as fixed points."""
    ax=[a for a in t["fvar"].axes if a.axisTag=="wght"][0]
    lo,df,hi=ax.minValue,ax.defaultValue,ax.maxValue
    norm=lambda u:(u-df)/(hi-df) if u>=df else (u-df)/(df-lo)
    denorm=lambda n:df+n*(hi-df) if n>=0 else df+n*(df-lo)
    def pl(pts,x):
        pts=sorted(pts)
        for (x0,y0),(x1,y1) in zip(pts,pts[1:]):
            if x0<=x<=x1: return y0+(x-x0)*(y1-y0)/(x1-x0)
        return pts[0][1] if x<pts[0][0] else pts[-1][1]
    old=t["avar"].segments["wght"] if "avar" in t else {-1.0:-1.0,0.0:0.0,1.0:1.0}
    oldpts=list(old.items()); inv=[(b,a) for a,b in pairs]
    xs={norm(u) for u,_ in pairs}|{norm(pl(inv,denorm(n))) for n in old}
    new={round(n,4):pl(oldpts,norm(pl(pairs,denorm(n)))) for n in sorted(xs)}
    if "avar" not in t:
        from fontTools.ttLib import newTable
        t["avar"]=newTable("avar"); t["avar"].segments={}
    t["avar"].segments["wght"]=new
def woff2(t,path):
    t.flavor="woff2"; t.save(path)
# Latin: Outfit, renamed. Outfit has no U+2009 THIN SPACE or U+202F NARROW NO-BREAK SPACE, so both
# fell back to a system font. Map them to Outfit's own space glyph (0.208 em at 400, about the 1/5 em
# the Unicode Standard gives a thin space) rather than drawing a new width. Stress test J6.
o=TTFont("Outfit-VF.ttf")
for st in o["cmap"].tables:
    if st.isUnicode():
        for cp in (0x2009,0x202F): st.cmap.setdefault(cp,"space")
rename(o,"Altruvex Sans Latin Proto","AltruvexSansLatinProto"); woff2(o,f"{OUT}/AltruvexSans-Latin-proto.woff2")
ARABIC="U+0600-06FF,U+0750-077F,U+0870-089F,U+08A0-08FF,U+FB50-FDFF,U+FE70-FEFF,U+200C-200F,U+2010-2011,U+204F,U+2E41,U+25CC"
for k in (1.0625,1.10):
    v=TTFont("Vazirmatn-VF.ttf")
    opts=subset.Options(); opts.layout_features=["*"]; opts.name_IDs=["*"]; opts.name_languages=["*"]; opts.notdef_outline=True; opts.glyph_names=False
    s=subset.Subsetter(opts); s.populate(unicodes=subset.parse_unicodes(ARABIC)); s.subset(v)
    upm=v["head"].unitsPerEm
    scale_upem(v, round(upm*k)); v["head"].unitsPerEm=upm   # glyphs, GPOS, gvar, HVAR now x k relative to the em
    # Keep Vazirmatn's own ascent/descent (now x k). Copying Outfit's shallow
    # descender (-0.26 em) made background-clip:text gradients (<Accent>) drop
    # the dots under yeh/beh, which sit near -0.50 em. CSS line-height is fixed
    # on every heading, so the deeper box does not move layout.
    os2=v["OS/2"]
    os2.usWinAscent=max(v["head"].yMax,os2.usWinAscent); os2.usWinDescent=max(-v["head"].yMin,os2.usWinDescent)
    if k==1.0625:
        # Vazirmatn gains weight more slowly than Outfit above 500 (stress test C2/J2: Arabic ink
        # density fell to 0.92/0.89 of Latin at 600/700 against 0.96 at 300 and 500). Requested
        # 600/700 now draw Vazirmatn 670/825, the density match averaged over two text samples.
        # 100-500 are unchanged. The x1.10 file is kept as built for the record.
        remap_wght(v,[(100,100),(400,400),(500,500),(600,670),(700,825),(900,900)])
    tag=str(k).replace(".","")
    rename(v,f"Altruvex Sans Arabic Proto {k}",f"AltruvexSansArabicProto{tag}")
    woff2(v,f"{OUT}/AltruvexSans-Arabic-x{tag}-proto.woff2")
# today's faces, for the left column (unmodified files)
for f,n in (("Outfit-VF.ttf","Outfit-today.woff2"),("Vazirmatn-VF.ttf","Vazirmatn-today.woff2")):
    t=TTFont(f); woff2(t,f"{OUT}/{n}")
print("ok")
