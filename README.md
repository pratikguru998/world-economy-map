# World Economy Map

A disk-usage-analyzer style sunburst (like Ubuntu's Baobab) for the world economy.

**Live:** https://pratikguru998.github.io/world-economy-map/

- **Ring 1** — economies, sized by nominal GDP (2024, IMF WEO)
- **Ring 2** — industries, sized by share of value added
- **Ring 3** — sub-industries (e.g. Manufacturing → Autos, Pharma, Electronics…)
- **Ring 4** — companies in each sub-industry, sized by annual revenue (up to 30 per slice, the rest grouped as "+N more")
- **India's agriculture and food** go one level further: crops → rice, wheat, vegetables, pulses…; livestock → milk,
  meat, eggs; fishing; forestry; and food manufacturing → dairy, edible oils, sugar, beverages… each with a one-line
  fact and the companies behind it (MoSPI value of output, 2023-24).

Click a slice to zoom in, click the centre to go back, hover for details. Switch between
**By country** (World → Country → Industry → Company) and **By industry**
(World → Industry → Country → Company), or search for any country, industry or company.

## A note on the numbers

Figures are approximate and rounded, for orientation only. Company revenue is gross sales,
not value added, so large firms can exceed their industry's GDP share; those slices are scaled
down to fit and marked ⚠. "Rest of …" slices stand for smaller firms, public bodies and households.

## Data

- `data.js` — GDP, industry shares, the sub-industry taxonomy, national-accounts sub-industry
  shares for the five largest economies, and hand-curated companies.
- `companies.js` — **generated**: ~3,200 companies (name, revenue in USD bn, sub-industry, source, year),
  merged from screener.in (India's ~300 largest listed companies by sales, with NSE industries),
  the curated list, Wikipedia's "largest companies in …" tables and Wikidata revenue statements,
  converted to USD, classified into sub-industries and de-duplicated.

Rebuild `companies.js`:

```bash
python3 scripts/fetch_sources.py /tmp/wem-raw
python3 scripts/build_companies.py /tmp/wem-raw
```

India comes from screener.in: run `scripts/fetch_screener.js` in the browser console while logged in to
screener.in and save the copied JSON as `/tmp/wem-raw/screener_india.json` before building. Consolidated sales
are adjusted for listed subsidiaries in `scripts/screener_adjustments.json`; industries map to sub-industries via
`scripts/screener_industries.json`.

Fix a misclassified company in `scripts/sub_overrides.json` (`"Name": "sub"` or `"Name": ["sector", "sub"]`).

### Licences

Company data derived from Wikipedia is available under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/);
Wikidata is CC0. GDP figures are from the IMF World Economic Outlook.

## Run locally

```bash
python3 -m http.server 8000
```
