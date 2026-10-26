"""Download the raw inputs for build_companies.py into RAW_DIR.

  python3 scripts/fetch_sources.py RAW_DIR
  python3 scripts/build_companies.py RAW_DIR
"""
import json
import os
import sys
import time
import urllib.parse
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = sys.argv[1]
UA = {"User-Agent": "world-economy-map/0.1 (https://github.com/pratikguru998/world-economy-map)"}
os.makedirs(os.path.join(RAW, "wiki"), exist_ok=True)


def get(url, **kw):
    return urllib.request.urlopen(urllib.request.Request(url, headers={**UA, **kw}), timeout=300).read()


# Wikidata: company revenue statements dated 2020+
query = open(os.path.join(HERE, "wikidata_revenue.rq")).read()
csv_bytes = get("https://query.wikidata.org/sparql?" + urllib.parse.urlencode({"query": query}), Accept="text/csv")
open(os.path.join(RAW, "wikidata.csv"), "wb").write(csv_bytes)

# labels for the currency and country items used
import csv, io
rows = list(csv.DictReader(io.StringIO(csv_bytes.decode())))
ids = sorted({r[c].rsplit("/", 1)[-1] for r in rows for c in ("unit", "country")})
labels = {}
for i in range(0, len(ids), 50):
    d = json.loads(get("https://www.wikidata.org/w/api.php?" + urllib.parse.urlencode(
        {"action": "wbgetentities", "ids": "|".join(ids[i:i + 50]), "props": "labels", "languages": "en", "format": "json"})))
    for k, v in d["entities"].items():
        labels[k] = v.get("labels", {}).get("en", {}).get("value", k)
json.dump(labels, open(os.path.join(RAW, "labels.json"), "w"), ensure_ascii=False)

# Wikipedia "largest companies" lists (rate-limited: be gentle)
for line in open(os.path.join(HERE, "wiki_pages.txt")).read().strip().splitlines():
    key, title = line.split("=", 1)
    path = os.path.join(RAW, "wiki", key + ".html")
    if os.path.exists(path):
        continue
    for attempt in range(6):
        try:
            d = json.loads(get("https://en.wikipedia.org/w/api.php?" + urllib.parse.urlencode(
                {"action": "parse", "page": title, "prop": "text", "format": "json", "redirects": 1})))
            if "parse" in d:
                open(path, "w").write(d["parse"]["text"]["*"])
            break
        except Exception:
            time.sleep(10 * (attempt + 1))
    time.sleep(4)
