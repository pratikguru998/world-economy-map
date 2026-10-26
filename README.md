# World Economy Map

A disk-usage-analyzer style sunburst (like Ubuntu's Baobab) for the world economy.

**Live:** https://pratikguru998.github.io/world-economy-map/

- **Ring 1** — economies, sized by nominal GDP (2024, IMF WEO)
- **Ring 2** — industries, sized by share of value added
- **Ring 3** — the largest companies in each industry, sized by annual revenue

Click a slice to zoom in, click the centre to go back, hover for details. Switch between
**By country** (World → Country → Industry → Company) and **By industry**
(World → Industry → Country → Company), or search for any country, industry or company.

## A note on the numbers

Figures are approximate and rounded, for orientation only. Company revenue is gross sales,
not value added, so large firms can exceed their industry's GDP share; those slices are scaled
down to fit and marked ⚠. "Rest of …" slices stand for smaller firms, public bodies and households.

## Editing the data

All data lives in [`data.js`](data.js): `COUNTRIES` (GDP, 12 sector shares, top companies per sector)
and `REGIONS` (remaining economies). No build step — it's a static site using D3 from a CDN.

```bash
python3 -m http.server 8000
```
