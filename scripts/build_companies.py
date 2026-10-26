"""Build companies.js: the company layer of the World Economy Map.

Merges three sources, in priority order:
  1. curated companies in data.js (hand-picked, ~FY2024 revenue)
  2. Wikipedia "List of largest companies in <country>" tables (CC BY-SA)
  3. Wikidata company revenue statements dated 2020+ (CC0)

Each company is converted to USD billions, classified into a sector and
sub-industry (SUBSECTORS in data.js) from its industry text or name, and
de-duplicated across sources and countries.

Usage (raw inputs are fetched by scripts/fetch_sources.py):
  python3 scripts/build_companies.py RAW_DIR
"""
import csv
import io
import json
import os
import re
import subprocess
import sys
import unicodedata
import warnings
from collections import defaultdict

import pandas as pd

warnings.filterwarnings("ignore")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = sys.argv[1]
MAX_PER_SECTOR = 100
MIN_REVENUE = 0.2  # USD bn

# --- base data from data.js -------------------------------------------------

base = json.loads(subprocess.check_output(["node", "-e", """
const s = require('fs').readFileSync(process.argv[1], 'utf8');
const d = new Function(s + '; return {SECTORS, SUBSECTORS, COUNTRIES, REGIONS};')();
console.log(JSON.stringify(d));
""", os.path.join(ROOT, "data.js")]))
ALL_COUNTRIES = base["COUNTRIES"] + [c for r in base["REGIONS"] for c in r["countries"]]
COUNTRY_NAMES = {c["name"] for c in ALL_COUNTRIES}
COUNTRY_ALIASES = {
    "People's Republic of China": "China", "Czech Republic": "Czechia", "United Arab Emirates": "UAE",
    "Kingdom of the Netherlands": "Netherlands", "Northern Ireland": "United Kingdom", "Türkiye": "Turkey",
    "Republic of Ireland": "Ireland", "Korea": "South Korea", "Republic of Korea": "South Korea",
    "U.S.": "United States", "USA": "United States", "UK": "United Kingdom", "England": "United Kingdom",
    "Scotland": "United Kingdom", "Hong Kong SAR": "Hong Kong", "Viet Nam": "Vietnam",
}

# --- currency → USD (approximate 2023-24 average rates) -------------------

FX = {
    "USD": 1, "EUR": 1.08, "CAD": 0.74, "CZK": 0.044, "JPY": 0.0068, "GBP": 1.26, "MXN": 0.056, "UAH": 0.026,
    "AUD": 0.66, "ILS": 0.27, "RUB": 0.0115, "DKK": 0.145, "SEK": 0.094, "PLN": 0.25, "INR": 0.012, "BGN": 0.55,
    "NZD": 0.61, "NOK": 0.093, "CHF": 1.13, "CNY": 0.139, "TRY": 0.035, "SGD": 0.745, "KRW": 0.00074,
    "HUF": 0.0028, "SAR": 0.267, "RON": 0.218, "TWD": 0.031, "IDR": 0.000063, "NGN": 0.0009, "HKD": 0.128,
    "PKR": 0.0036, "KZT": 0.0021, "AED": 0.272, "EGP": 0.025, "IQD": 0.00076, "PHP": 0.0176, "BRL": 0.19,
    "BDT": 0.0088, "DZD": 0.0074, "THB": 0.028, "MYR": 0.215, "VND": 0.00004, "ZAR": 0.054, "CLP": 0.0011,
    "COP": 0.00024, "ARS": 0.0011, "QAR": 0.275, "KWD": 3.25, "EGP_": 0.025,
}
WD_UNITS = {  # Wikidata currency items
    "Q4917": "USD", "Q4916": "EUR", "Q18100": "EUR", "Q1104069": "CAD", "Q131016": "CZK", "Q8146": "JPY",
    "Q25224": "GBP", "Q81893": "UAH", "Q259502": "AUD", "Q131309": "ILS", "Q41044": "RUB", "Q25417": "DKK",
    "Q122922": "SEK", "Q123213": "PLN", "Q80524": "INR", "Q172540": "BGN", "Q1472704": "NZD", "Q132643": "NOK",
    "Q25344": "CHF", "Q39099": "CNY", "Q172872": "TRY", "Q190951": "SGD", "Q202040": "KRW", "Q47190": "HUF",
    "Q199857": "SAR", "Q131645": "RON", "Q208526": "TWD", "Q41588": "IDR", "Q203567": "NGN", "Q31015": "HKD",
    "Q188289": "PKR", "Q173751": "KZT", "Q200294": "AED", "Q199462": "EGP", "Q193094": "IQD", "Q17193": "PHP",
    "Q173117": "BRL", "Q194453": "BDT", "Q199674": "DZD", "Q177882": "THB",
}
PESO = {"Mexico": "MXN", "Philippines": "PHP", "Colombia": "COP", "Chile": "CLP", "Argentina": "ARS"}
LOCAL = {  # currency used by a country's own Wikipedia list when the header doesn't say
    "Japan": "JPY", "India": "INR", "Brazil": "BRL", "South Korea": "KRW", "Mexico": "MXN", "Indonesia": "IDR",
    "Taiwan": "TWD", "Thailand": "THB", "Philippines": "PHP", "Vietnam": "VND", "Malaysia": "MYR", "Pakistan": "PKR",
    "Nigeria": "NGN", "South Africa": "ZAR", "Poland": "PLN", "Denmark": "DKK", "Saudi Arabia": "SAR", "UAE": "AED",
    "Israel": "ILS", "Turkey": "TRY", "Russia": "RUB", "Switzerland": "CHF", "Australia": "AUD", "Canada": "CAD",
    "United Kingdom": "GBP", "Singapore": "SGD", "Egypt": "EGP", "Chile": "CLP", "Colombia": "COP", "Argentina": "ARS",
    "Norway": "NOK", "Sweden": "SEK", "China": "CNY",
}
EURO = {"Germany", "France", "Italy", "Spain", "Netherlands", "Ireland", "Austria", "Finland", "Belgium", "Portugal", "Greece"}

# --- classification ---------------------------------------------------------

# (regex on industry text, sector, sub); first match wins. None sector = not a company, drop.
IND_RULES = [
    (r"charit|religio|voluntary|philanthrop|non-?profit|association|trade union|relief|animal protection|community development|advocacy|political", None, None),
    (r"health insurance|insurance|reinsurance|assurance", "fin", "insurance"),
    (r"pharm|biotech|medical (technology|device|equipment)|life science|genomic|vaccine|drug", "mfg", "pharma"),
    (r"hospital|health care|healthcare|clinic|nursing|rehabilitation|outpatient|elderly|\bhealth\b|social services|welfare", "public", "health"),
    (r"universit|higher education|education|school|college", "public", "education"),
    (r"government|public administration|armed forces|military(?! vehicle)", "public", "gov"),
    (r"aerospace|aircraft|defen[cs]e industry|weapons|arms industry|space industry|spaceflight|military fighting|shipbuilding", "mfg", "aero"),
    (r"\bbank|monetary intermediation|credit union|savings|mortgage", "fin", "banking"),
    (r"payment|fintech|credit card|pawn", "fin", "fintech"),
    (r"asset management|investment|securities|stock exchange|private equity|brokerage|wealth|financial|finance", "fin", "invest"),
    (r"refin(ed|ing)|petrochemical", "mfg", "refining"),
    (r"petroleum|oil and gas|oil & gas|natural gas|crude|gas industry|pipeline|oilfield|drilling|\blng\b|fuels", "energy", "oilgas"),
    (r"mining|\bcoal|gold|copper|\bores?\b|quarr|uranium|lithium|phosphate", "energy", "mining"),
    (r"electrical (industry|equipment|engineering)|electrical appliance|home appliance|power engineering|electric motor", "mfg", "machinery"),
    (r"electric|\bpower\b|utilit|water supply|energy|renewable|solar|wind|nuclear|heating|steam", "energy", "power"),
    (r"airline|air transport|aviation|airport", "transport", "air"),
    (r"railway equipment|rolling stock", "mfg", "machinery"),
    (r"\brail", "transport", "rail"),
    (r"shipping|maritime|water transport|port operator|container|cargo handling|water transportation|\bports?\b", "transport", "shipping"),
    (r"truck(ing)?\b(?! manufactur)|road transport|freight transport by road|\bbus\b|coach|taxi|ride", "transport", "road"),
    (r"logistic|courier|postal|\bmail|parcel|warehous|freight|delivery service|transport", "transport", "logistics"),
    (r"mobile phone industry|telecommunications (device|equipment)|networking hardware|semiconductor|electronic|computer hardware|computer industry|battery|display", "mfg", "electronics"),
    (r"telecom|internet service provider|cable television|broadband|wireless|mobile network", "tech", "telecom"),
    (r"it service|information technology consulting|outsourcing|it consulting|computer service|system integrat|it infrastructure", "tech", "itservices"),
    (r"e-commerce|online retail|online grocer|retail|supermarket|grocer|department store|hypermarket|convenience store|hardware store|pharmacy|optician|stores", "trade", "retail"),
    (r"software|internet|search engine|social (network|media)|cloud|saas|\bweb\b|online|video game|digital|data processing|artificial intelligence|computer security|information security|analytics|information technology|technology company", "tech", "software"),
    (r"media|broadcast|television|film|music|publishing|newspaper|entertainment industry|streaming|animation|radio|advertising|show business", "tech", "media"),
    (r"automotive|motor vehicle|automobile|car manufactur|truck manufactur|tyre|tire|vehicle|motorcycle", "mfg", "autos"),
    (r"steel|\biron\b|metal|alumin|cement|glass|construction materials|building materials|non-ferrous", "mfg", "metals"),
    (r"chemical|plastic|rubber|fertili|paint|coating|industrial gas|glue|paper|pulp|packaging", "mfg", "chemicals"),
    (r"food|beverage|brew|drink|dairy|meat|bakery|coffee|tobacco|spirits|distill|wine|confection|sugar|snack", "mfg", "food"),
    (r"agricultur|farming|\bcrops?\b|grain|seeds|plantation|palm oil|agribusiness", "ag", "crops"),
    (r"livestock|poultry|cattle", "ag", "livestock"),
    (r"forestry|logging|sawmill|wood|fishing|aquaculture|seafood", "ag", "forestry"),
    (r"machinery|mechanical engineering|industrial manufacturing|automation|engine|machine|equipment|robot|elevator|hvac|tools|industry$", "mfg", "machinery"),
    (r"textile|clothing|apparel|fashion|footwear|cosmetic|personal care|consumer goods|fast-moving|luxury|household|furniture|\btoy|sporting goods|jewel|watch|bicycle", "mfg", "consumer"),
    (r"homebuild|residential", "constr", "building"),
    (r"construction|civil engineering|infrastructure", "constr", "infra"),
    (r"real estate|reit|property|realty|renting and operating", "realestate", "property"),
    (r"leasing|rental", "realestate", "leasing"),
    (r"commodit|trading house|sogo shosha", "trade", "trading"),
    (r"wholesale|distribution|distributor|trade of|trading|\btrade\b", "trade", "wholesale"),
    (r"restaurant|food service|fast food|catering|food delivery|coffeehouse", "hosp", "restaurants"),
    (r"hotel|hospitality|touris|travel|cruise|resort", "hosp", "hotels"),
    (r"gambling|casino|amusement|sport|theme park|recreation|leisure|cinema", "hosp", "leisure"),
    (r"waste|recycling|environment", "prof", "waste"),
    (r"staffing|employment|human resource|security services|facility|cleaning|fire protection", "prof", "staffing"),
    (r"consult|accounting|audit|legal|law firm|research|engineering|architecture|professional services|marketing|public relations", "prof", "consulting"),
    (r"conglomerate|holding|head offices", "prof", "holding"),
]
NAME_RULES = [
    (r"foundation|charit|church|diocese|association|\bcity of\b|county|ministry|council\b", None, None),
    (r"insurance|assurance|versicherung|\blife\b|\bre\b|reinsurance", "fin", "insurance"),
    (r"\bbank|bancorp|banco|banque|sparkasse|kreditanstalt|savings|credit union|bancshares", "fin", "banking"),
    (r"pharma|therapeutics|biotech|\bbio", "mfg", "pharma"),
    (r"universit|college|school", "public", "education"),
    (r"hospital|health|medical cent|clinic", "public", "health"),
    (r"airlines?\b|airways|\baviation", "transport", "air"),
    (r"railway|\brail\b|railroad", "transport", "rail"),
    (r"refin", "mfg", "refining"),
    (r"\boil\b|petro|\bgas\b", "energy", "oilgas"),
    (r"mining|\bmines?\b|minerals|\bcoal|gold|copper", "energy", "mining"),
    (r"steel|metals|cement|alumin", "mfg", "metals"),
    (r"energy|power|electric|utilit|hydro|\bwater\b", "energy", "power"),
    (r"telecom|communications|mobile|wireless", "tech", "telecom"),
    (r"motors?\b|automotive|\bauto\b", "mfg", "autos"),
    (r"foods?\b|beverage|brewer|dairy|breweries", "mfg", "food"),
    (r"chemical", "mfg", "chemicals"),
    (r"construction|builders|engineering", "constr", "infra"),
    (r"logistics|express|freight|transport", "transport", "logistics"),
    (r"shipping|maritime|\bport", "transport", "shipping"),
    (r"retail|stores|supermarket|\bmart\b", "trade", "retail"),
    (r"software|technologies|\btech\b|digital|\bdata\b", "tech", "software"),
    (r"properties|realty|real estate|\breit\b", "realestate", "property"),
    (r"hotels?\b|resorts?\b", "hosp", "hotels"),
    (r"capital|investment|asset|securities|financial|finance", "fin", "invest"),
]
IND_RULES = [(re.compile(p), s, b) for p, s, b in IND_RULES]
NAME_RULES = [(re.compile(p), s, b) for p, s, b in NAME_RULES]


STRONG_NAME = re.compile(r"insurance|assurance|\bbank|bancorp|banco|airlines?\b|airways|universit|hospital|railway")


def classify(industry, name):
    text = (industry or "").lower()
    if STRONG_NAME.search(name.lower()):
        text = ""
    if text:
        for rx, s, b in IND_RULES:
            if rx.search(text):
                return (s, b) if s else ("drop", None)
    for rx, s, b in NAME_RULES:
        if rx.search(name.lower()):
            return (s, b) if s else ("drop", None)
    return (None, None)


# --- name normalisation / dedupe -------------------------------------------

STOP = set("""inc incorporated corp corporation co company companies ltd limited plc ag se sa nv bv spa ab asa oyj as gmbh kgaa
holdings holding group the llc lp kk tbk pt bhd berhad sab de cv the of and public jsc pjsc oao pao ojsc""".split())
# names that refer to the same business (parent groups whose listed arm is already in the data, renames)
ALIASES = {
    "china national petroleum": "petrochina", "china petrochemical": "sinopec", "china national offshore oil": "cnooc",
    "power china": "powerchina", "power construction china": "powerchina", "baowu": "china baowu steel",
    "people s insurance china": "picc", "people s insurance": "picc", "robert bosch": "bosch", "dior lvmh": "lvmh",
    "christian dior": "lvmh", "lvmh moet hennessy louis vuitton": "lvmh", "total": "totalenergies",
    "electricite france": "edf", "hon hai precision industry": "foxconn", "tokyo electric power": "tepco",
    "hcl technologies": "hcltech", "dmart": "avenue supermarts", "sf": "sf express", "nippon telegraph telephone": "ntt",
    "deutsche post": "dhl", "walt disney": "disney", "exxon mobil": "exxonmobil", "alphabet google": "alphabet",
    "life insurance corporation india": "lic", "oil natural gas": "ongc", "hindustan petroleum": "hpcl",
    "bharat petroleum": "bpcl", "indian oil": "indian oil", "fomento economico mexicano": "femsa",
    "taiwan semiconductor manufacturing": "tsmc", "mitsubishi ufj financial": "mufg", "sumitomo mitsui financial": "smfg",
    "industrial commercial bank china": "icbc", "united parcel service": "ups", "saudi basic industries": "sabic",
    "saudi telecom": "stc", "banco bilbao vizcaya argentaria": "bbva", "banco santander": "santander",
    "assicurazioni generali": "generali", "peoples insurance china": "picc", "people insurance china": "picc",
    "vtb bank": "vtb", "byd auto": "byd", "alimentation couche tard": "couche tard", "sberbank russia": "sberbank",
    "toyota motor": "toyota", "honda motor": "honda", "nissan motor": "nissan", "samsung life insurance": "samsung life",
}
SKIP_NAMES = {"sk", "tata sons", "samsung", "lg", "hyundai", "groupe psa", "fiat chrysler automobiles", "daimler"}  # group parents whose units are listed separately


def norm(name):
    n = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode().lower()
    n = re.sub(r"\(.*?\)", " ", n)
    n = re.sub(r"[^a-z0-9 ]+", " ", n)
    n = re.sub(r"\b(?:[a-z] ){1,}[a-z]\b", lambda m: m.group(0).replace(" ", ""), n)  # "i o c l" -> "iocl"
    n = " ".join(w for w in n.split() if w not in STOP and len(w) > 1)
    return ALIASES.get(n, n)


def keys_for(name):
    keys = {norm(name)}
    for inner in re.findall(r"\((.*?)\)", name):
        if not re.match(r"part of|incl", inner, re.I):
            keys.add(norm(inner))
    words = [w for w in re.split(r"[^A-Za-z0-9]+", re.sub(r"\(.*?\)", " ", name)) if w and w.lower() not in ("and", "of", "the")]
    if len(words) >= 3:
        keys.add("acrN:" + "".join(w[0] for w in words).lower())
    if len(words) == 1 and words[0].isupper() and 2 <= len(words[0]) <= 6:
        keys.add("acr1:" + words[0].lower())
    keys.update({k.replace(" ", "") for k in list(keys) if not k.startswith(("acr1:", "acrN:"))})
    return {k for k in keys if k}


class Registry:
    def __init__(self):
        self.recs = []
        self.exact = {}
        self.by_first = defaultdict(list)

    def find(self, keys, key, rec):
        # rows from the same hand-checked source (screener, curated) are distinct companies by construction
        both_screener = lambda r: r["src"] == rec["src"] and r["src"] in ("s", "c")
        for k in keys:
            if k.startswith(("acr1:", "acrN:")):  # abbreviation <-> full name, same sector only
                other = self.exact.get(("acr1:" if k.startswith("acrN:") else "acrN:") + k.split(":", 1)[1])
                if other and not both_screener(other) and other["sector"] == rec["sector"]:
                    return other
            elif k in self.exact and not both_screener(self.exact[k]):
                return self.exact[k]
        for r in self.by_first[key.split()[0]]:
            if r["country"] != rec["country"] or both_screener(r):
                continue  # "Bosch India" is not "Bosch"
            a, b = r["key"], key
            short, long_ = (a, b) if len(a) < len(b) else (b, a)
            if long_.startswith(short + " ") and (len(short.split()) >= 2 or len(short) >= 4):
                return r
        return None

    def add(self, rec):
        rec["key"] = norm(rec["name"]) or re.sub(r"\W+", " ", rec["name"].lower()).strip()
        if not rec["key"] or rec["key"] in SKIP_NAMES or re.search(r"\(part of", rec["name"], re.I):
            return None
        keys = keys_for(rec["name"])
        hit = self.find(keys, rec["key"], rec)
        if hit:
            # fill in classification from lower-priority sources
            if hit.get("sector") in (None, "drop") and rec.get("sector") not in (None, "drop"):
                hit["sector"], hit["sub"] = rec["sector"], rec["sub"]
            elif hit.get("sector") == rec.get("sector") and not hit.get("sub"):
                hit["sub"] = rec.get("sub")
            return hit
        self.recs.append(rec)
        for k in keys:
            self.exact.setdefault(k, rec)
        self.by_first[rec["key"].split()[0]].append(rec)
        return rec


reg = Registry()

# 0. screener.in: India's largest listed companies by trailing-12-month sales (scripts/fetch_screener.js).
# Takes priority over the curated list for India: these are reported figures, not estimates.
SCREENER_MAP = json.load(open(os.path.join(ROOT, "scripts", "screener_industries.json")))
SCREENER_NAMES = json.load(open(os.path.join(ROOT, "scripts", "screener_names.json")))  # display names for abbreviations
screener_path = os.path.join(RAW, "screener_india.json")
SCREENER_ADJ = json.load(open(os.path.join(ROOT, "scripts", "screener_adjustments.json")))
if os.path.exists(screener_path):
    screener_rows = json.load(open(screener_path))
    by_name = {r["name"]: r["sales"] for r in screener_rows}
    for r in screener_rows:
        adj = SCREENER_ADJ.get(r["name"], {})
        if adj.get("drop"):
            continue
        r["sales"] -= sum(m if isinstance(m, (int, float)) else by_name[m] for m in adj.get("minus", []))
    for r in screener_rows:
        if SCREENER_ADJ.get(r["name"], {}).get("drop") or r["sales"] <= 0:
            continue
        key = r.get("Industry") or r.get("Broad Industry") or ""
        sector, sub = SCREENER_MAP.get(key, [None, None])
        if not sector:
            print("WARN unmapped screener industry:", key, r["name"])
            continue
        reg.add({"name": SCREENER_NAMES.get(r["name"], r["name"]), "rev": round(r["sales"] * 1e7 * FX["INR"] / 1e9, 2),
                 "country": "India", "sector": sector, "sub": sub, "src": "s", "year": r.get("year")})

# 1. curated
for c in ALL_COUNTRIES:
    for sector, lst in (c.get("cos") or {}).items():
        for item in lst:
            reg.add({"name": item[0], "rev": item[1], "country": c["name"], "sector": sector,
                     "sub": item[2] if len(item) > 2 else None, "src": "c", "year": 2024})

# 2. Wikipedia tables
MULT = [(r"trillion", 1e12), (r"billion|\bbn\b|bil\b", 1e9), (r"million|\bmn\b|\bmil\b|\bm\b", 1e6), (r"crore", 1e7), (r"lakh", 1e5)]
CUR_TOKENS = [
    (r"US\$|USD|U\.S\. ?\$|US dollars?", "USD"), (r"€|EUR|euro", "EUR"), (r"£|GBP", "GBP"), (r"¥|JPY|yen", "JPY"),
    (r"₹|INR|crore|Rs\.?|rupee", "INR"), (r"R\$|BRL|reais", "BRL"), (r"₩|KRW|won", "KRW"), (r"NT\$|TWD", "TWD"),
    (r"RM|MYR|ringgit", "MYR"), (r"S\$|SGD", "SGD"), (r"A\$|AUD", "AUD"), (r"C\$|CAD|CA\$", "CAD"), (r"CHF", "CHF"),
    (r"zł|PLN", "PLN"), (r"DKK|kr\.", "DKK"), (r"SEK", "SEK"), (r"NOK", "NOK"), (r"₱|PHP", "PHP"), (r"฿|THB|baht", "THB"),
    (r"IDR|Rp|rupiah", "IDR"), (r"SAR|riyal", "SAR"), (r"AED|dirham", "AED"), (r"MXN|pesos", "MXN"), (r"ZAR|rand", "ZAR"),
    (r"NGN|₦|naira", "NGN"), (r"TRY|₺|lira", "TRY"), (r"RUB|₽|rouble|ruble", "RUB"), (r"VND|₫|dong", "VND"),
    (r"PKR", "PKR"), (r"RMB|CNY|yuan|renminbi", "CNY"), (r"₪|ILS|NIS|shekel", "ILS"), (r"HK\$|HKD", "HKD"), (r"\$", "USD"),
]


def detect_currency(text):
    for rx, cur in CUR_TOKENS:
        if re.search(rx, text):
            return cur
    return None


def detect_mult(text):
    for rx, m in MULT:
        if re.search(rx, text, re.I):
            return m
    return None


def parse_amount(cell, header_mult):
    s = str(cell)
    s = re.sub(r"\[.*?\]", "", s)
    m = re.search(r"-?\d[\d,]*(\.\d+)?", s.replace(" ", ""))
    if not m:
        return None, None
    num = float(m.group(0).replace(",", ""))
    mult = detect_mult(s) or header_mult
    return num, mult


def country_from_text(text):
    t = str(text)
    for alias, name in COUNTRY_ALIASES.items():
        if alias in t:
            return name
    for name in COUNTRY_NAMES:
        if name in t:
            return name
    return None


PAGE_OVERRIDES = json.load(open(os.path.join(ROOT, "scripts", "wiki_overrides.json")))
wiki_dir = os.path.join(RAW, "wiki")
report = []
for fn in sorted(os.listdir(wiki_dir)):
    page = fn[:-5]
    ov = PAGE_OVERRIDES.get(page, {})
    if ov.get("skip"):
        continue
    page_country = None if page.startswith("_") else page
    html = open(os.path.join(wiki_dir, fn)).read()
    try:
        tables = pd.read_html(io.StringIO(html))
    except ValueError:
        continue
    for ti, t in enumerate(tables):
        if len(t) < 8 or ("tables" in ov and ti not in ov["tables"]):
            continue
        if isinstance(t.columns, pd.MultiIndex):
            t.columns = [" ".join(dict.fromkeys(str(x) for x in col)) for col in t.columns]
        cols = [str(c) for c in t.columns]
        name_c = next((c for c in cols if re.match(r"^(name|company|company name|corporation|firm|enterprise)\b", c, re.I)), None)
        rev_c = ov.get("revenue_col") or next((c for c in cols if re.search(r"revenue|sales|turnover", c, re.I)
                                                and not re.search(r"growth|%|change|rank", c, re.I)), None)
        if not name_c or not rev_c or rev_c not in cols:
            continue
        ind_c = next((c for c in cols if re.search(r"industry|sector", c, re.I)), None)
        ctry_c = next((c for c in cols if re.search(r"headquarters|country|\bhq\b", c, re.I)), None)
        hdr_cur = ov.get("currency") or detect_currency(rev_c)
        hdr_mult = ov.get("mult") or detect_mult(rev_c)
        n_ok = 0
        sample = []
        for _, row in t.iterrows():
            name = re.sub(r"\[.*?\]", "", str(row[name_c])).strip()
            if not name or name.lower() == "nan":
                continue
            country = page_country or (country_from_text(row[ctry_c]) if ctry_c else None)
            if not country or country not in COUNTRY_NAMES:
                continue
            num, mult = parse_amount(row[rev_c], hdr_mult)
            if num is None or num <= 0:
                continue
            cur = hdr_cur or detect_currency(str(row[rev_c])) or LOCAL.get(country) or ("EUR" if country in EURO else "USD")
            if not mult:
                continue
            usd_bn = num * mult * FX[cur] / 1e9
            if usd_bn < MIN_REVENUE or usd_bn > 700:
                continue
            industry = str(row[ind_c]) if ind_c else ""
            sector, sub = classify(industry, name)
            if sector == "drop":
                continue
            reg.add({"name": name, "rev": round(usd_bn, 2), "country": country, "sector": sector, "sub": sub,
                     "src": "w", "year": None})
            n_ok += 1
            if len(sample) < 3:
                sample.append(f"{name}={usd_bn:.1f}")
        if n_ok:
            report.append(f"{page:16s} t{ti} {n_ok:4d} [{hdr_cur} x{hdr_mult}] {rev_c[:40]!r}: {', '.join(sample)}")

# 3. Wikidata
labels = json.load(open(os.path.join(RAW, "labels.json")))
latest = {}
for r in csv.DictReader(open(os.path.join(RAW, "wikidata.csv"))):
    q = r["co"].rsplit("/", 1)[-1]
    if q not in latest or r["date"] > latest[q]["date"]:
        latest[q] = r
for q, r in latest.items():
    par = latest.get(r["par"].rsplit("/", 1)[-1]) if r["par"] else None
    if par and par["country"] == r["country"]:
        continue  # same-country subsidiary: its revenue is already in the parent's
    country = labels.get(r["country"].rsplit("/", 1)[-1], "")
    country = COUNTRY_ALIASES.get(country, country)
    if country not in COUNTRY_NAMES:
        continue
    unit = r["unit"].rsplit("/", 1)[-1]
    cur = PESO.get(country) if unit == "Q4730" else WD_UNITS.get(unit)
    if not cur:
        continue
    usd_bn = float(r["rev"]) * FX[cur] / 1e9
    if usd_bn < MIN_REVENUE or usd_bn > 700:
        continue
    name = r["coLabel"]
    sector, sub = classify(r["inds"].replace("|", "; "), name)
    if sector == "drop":
        continue
    reg.add({"name": name, "rev": round(usd_bn, 2), "country": country, "sector": sector, "sub": sub,
             "src": "d", "year": int(r["date"][:4])})

# --- output -----------------------------------------------------------------

valid_subs = base["SUBSECTORS"]
SUB_OVERRIDES = json.load(open(os.path.join(ROOT, "scripts", "sub_overrides.json")))
# fallback when neither the industry text nor the name says which sub-industry a company is in
DEFAULT_SUB = {"energy": "oilgas", "ag": "crops", "constr": "infra", "transport": "logistics", "realestate": "property", "prof": "consulting",
               "hosp": "leisure", "trade": "retail", "tech": "software", "fin": "invest", "public": "health"}


def sub_for(rec):
    s = rec["sector"]
    ov = SUB_OVERRIDES.get(rec["name"])
    if isinstance(ov, list):  # [sector, sub]: the classifier picked the wrong sector
        rec["sector"] = ov[0]
        return ov[1]
    if ov:
        return ov
    if rec["sub"] in valid_subs.get(s, {}):
        return rec["sub"]
    for rx, rs, rb in NAME_RULES:
        if rs == s and rx.search(rec["name"].lower()):
            return rb
    return DEFAULT_SUB.get(s)


out = defaultdict(lambda: defaultdict(list))
counts = defaultdict(int)
for rec in reg.recs:
    s = rec["sector"]
    if s in (None, "drop"):
        continue
    sub = sub_for(rec)
    s = rec["sector"]
    if sub not in valid_subs[s]:
        print("WARN sub", sub, "not in", s, "for", rec["name"])
        sub = DEFAULT_SUB.get(s)
    out[rec["country"]][s].append([rec["name"], rec["rev"], sub, rec["src"], rec["year"]])
for country, sectors in out.items():
    for s, lst in sectors.items():
        lst.sort(key=lambda x: -x[1])
        del lst[MAX_PER_SECTOR:]
        counts[country] += len(lst)

with open(os.path.join(ROOT, "companies.js"), "w") as f:
    f.write("// Generated by scripts/build_companies.py — do not edit by hand.\n")
    f.write("// Sources: curated (data.js), Wikipedia company lists (CC BY-SA 4.0), Wikidata (CC0).\n")
    f.write("// country -> sector -> [name, revenue USD bn, sub-industry key | null, source c|w|d, year | null]\n")
    f.write("const COMPANIES = ")
    json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    f.write(";\n")

print("\n".join(report))
print("total companies:", sum(counts.values()))
print(sorted(counts.items(), key=lambda x: -x[1]))
