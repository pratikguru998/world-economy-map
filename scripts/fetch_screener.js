// Collects India's largest listed companies by sales from screener.in, with industries.
// Run in the browser console on any www.screener.in page while logged in (it uses your session),
// then save the copied JSON as RAW_DIR/screener_india.json and run build_companies.py.
// Polite: one request every ~1.5 s (about 10 minutes for ~340 companies).
(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const parse = (html) => new DOMParser().parseFromString(html, "text/html");
  const rows = [];
  for (let page = 1; page <= 7; page++) {
    const doc = parse(await (await fetch(`/screen/raw/?query=Sales+%3E+8000&sort=Sales&order=desc&limit=50&page=${page}`)).text());
    const table = doc.querySelector("table");
    if (!table) break;
    const heads = [...table.querySelector("tr").querySelectorAll("th")].map((th) => th.innerText.trim().replace(/\s+/g, " "));
    const salesCol = heads.indexOf("Sales Rs.Cr.");
    for (const tr of table.querySelectorAll("tr")) {
      const link = tr.querySelector('a[href^="/company/"]');
      const cells = tr.querySelectorAll("td");
      if (link && cells.length > salesCol)
        rows.push({ name: link.innerText.trim(), href: link.getAttribute("href"), sales: parseFloat(cells[salesCol].innerText.replace(/,/g, "")) });
    }
    await sleep(2000);
  }
  for (const r of rows) {
    const doc = parse(await (await fetch(r.href)).text());
    for (const a of doc.querySelectorAll('a[href^="/market/"]')) if (a.title) r[a.title] = a.innerText.trim();
    r.year = new Date().getFullYear();
    delete r.href;
    await sleep(1500);
  }
  copy(JSON.stringify(rows));
  console.log(`${rows.length} companies copied to clipboard`);
})();
