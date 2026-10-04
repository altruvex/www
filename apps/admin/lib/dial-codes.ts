const TABLE =
  "AF:93 AX:358 AL:355 DZ:213 AS:1684 AD:376 AO:244 AI:1264 AG:1268 AR:54 AM:374 AW:297 AU:61 AT:43 AZ:994 BS:1242 BH:973 BD:880 BB:1246 BY:375 BE:32 BZ:501 BJ:229 BM:1441 BT:975 BO:591 BQ:599 BA:387 BW:267 BR:55 IO:246 BN:673 BG:359 BF:226 BI:257 CV:238 KH:855 CM:237 CA:1 KY:1345 CF:236 TD:235 CL:56 CN:86 CX:61 CC:61 CO:57 KM:269 CG:242 CD:243 CK:682 CR:506 CI:225 HR:385 CU:53 CW:599 CY:357 CZ:420 DK:45 DJ:253 DM:1767 DO:1809 EC:593 EG:20 SV:503 GQ:240 ER:291 EE:372 SZ:268 ET:251 FK:500 FO:298 FJ:679 FI:358 FR:33 GF:594 PF:689 GA:241 GM:220 GE:995 DE:49 GH:233 GI:350 GR:30 GL:299 GD:1473 GP:590 GU:1671 GT:502 GG:44 GN:224 GW:245 GY:592 HT:509 VA:39 HN:504 HK:852 HU:36 IS:354 IN:91 ID:62 IR:98 IQ:964 IE:353 IM:44 IL:972 IT:39 JM:1876 JP:81 JE:44 JO:962 KZ:7 KE:254 KI:686 KP:850 KR:82 KW:965 KG:996 LA:856 LV:371 LB:961 LS:266 LR:231 LY:218 LI:423 LT:370 LU:352 MO:853 MG:261 MW:265 MY:60 MV:960 ML:223 MT:356 MH:692 MQ:596 MR:222 MU:230 YT:262 MX:52 FM:691 MD:373 MC:377 MN:976 ME:382 MS:1664 MA:212 MZ:258 MM:95 NA:264 NR:674 NP:977 NL:31 NC:687 NZ:64 NI:505 NE:227 NG:234 NU:683 NF:672 MK:389 MP:1670 NO:47 OM:968 PK:92 PW:680 PS:970 PA:507 PG:675 PY:595 PE:51 PH:63 PL:48 PT:351 PR:1787 QA:974 RE:262 RO:40 RU:7 RW:250 BL:590 SH:290 KN:1869 LC:1758 MF:590 PM:508 VC:1784 WS:685 SM:378 ST:239 SA:966 SN:221 RS:381 SC:248 SL:232 SG:65 SX:1721 SK:421 SI:386 SB:677 SO:252 ZA:27 SS:211 ES:34 LK:94 SD:249 SR:597 SJ:47 SE:46 CH:41 SY:963 TW:886 TJ:992 TZ:255 TH:66 TL:670 TG:228 TK:690 TO:676 TT:1868 TN:216 TR:90 TM:993 TC:1649 TV:688 UG:256 UA:380 AE:971 GB:44 US:1 UY:598 UZ:998 VU:678 VE:58 VN:84 VG:1284 VI:1340 WF:681 EH:212 YE:967 ZM:260 ZW:263";

export const DEFAULT_DIAL_ISO = "EG";

export const DIAL_CODES: Record<string, string> = Object.fromEntries(
  TABLE.split(" ").map((pair) => pair.split(":") as [string, string]),
);

const PREFERRED = ["US", "RU", "GB", "FI", "NO", "RE", "GP", "AU", "MA", "IT", "CW"];

const BY_CODE: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const [iso, code] of Object.entries(DIAL_CODES)) {
    if (!(code in map)) map[code] = iso;
  }
  for (const iso of PREFERRED) map[DIAL_CODES[iso]!] = iso;
  return map;
})();

export function dialCodeOf(iso: string): string {
  return DIAL_CODES[iso] ?? DIAL_CODES[DEFAULT_DIAL_ISO]!;
}

export function matchDialCode(
  digits: string,
): { iso: string; code: string } | null {
  for (let len = Math.min(4, digits.length); len >= 1; len--) {
    const code = digits.slice(0, len);
    const iso = BY_CODE[code];
    if (iso) return { iso, code };
  }
  return null;
}

export type PhoneParse = {
  iso: string;
  national: string;
  e164: string;
  error: string | null;
};

function asciiDigits(value: string): string {
  return value
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
}

export function parsePhone(raw: string, iso: string): PhoneParse {
  const text = asciiDigits(raw).trim();
  if (!text) return { iso, national: "", e164: "", error: null };
  if (/[^\d\s().\-+]/.test(text)) {
    return { iso, national: "", e164: "", error: "Use digits only." };
  }
  const international = /^(\+|00)/.test(text);
  let digits = text.replace(/\D/g, "");
  let code = dialCodeOf(iso);
  let resolved = iso;
  if (international) {
    if (text.startsWith("00")) digits = digits.slice(2);
    const hit = matchDialCode(digits);
    if (!hit) {
      return { iso, national: digits, e164: "", error: "Unknown country code." };
    }
    resolved = hit.iso;
    code = hit.code;
    digits = digits.slice(code.length);
  }
  const national = digits.replace(/^0+/, "");
  const total = code.length + national.length;
  if (total < 8 || total > 15) {
    return {
      iso: resolved,
      national,
      e164: "",
      error: "A phone number has 8 to 15 digits including the country code.",
    };
  }
  return { iso: resolved, national, e164: `+${code}${national}`, error: null };
}

export function splitStoredPhone(stored: string): { iso: string; text: string } {
  const digits = stored.replace(/\D/g, "");
  if (!digits) return { iso: DEFAULT_DIAL_ISO, text: stored };
  const parsed = parsePhone(`+${digits}`, DEFAULT_DIAL_ISO);
  return parsed.error
    ? { iso: DEFAULT_DIAL_ISO, text: stored }
    : { iso: parsed.iso, text: parsed.national };
}
