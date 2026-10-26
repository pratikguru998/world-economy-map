/* global d3, WORLD_GDP, SECTORS, COUNTRIES, REGIONS */

// Companies may take at most this share of a sector's slice; the remainder is "Rest of sector".
const MAX_COMPANY_SHARE = 0.85;

const fmt = (b) => {
  if (b >= 1000) return `$${(b / 1000).toFixed(b >= 10000 ? 1 : 2)}T`;
  if (b >= 1) return `$${b >= 100 ? Math.round(b) : b.toFixed(1).replace(/\.0$/, "")}B`;
  return `$${Math.round(b * 1000)}M`;
};
const pct = (x) => (x >= 0.1 ? `${(x * 100).toFixed(1)}%` : x >= 0.001 ? `${(x * 100).toFixed(2)}%` : "<0.1%");

// ---------- tree building ----------

function sectorShares(country) {
  const total = d3.sum(country.shares);
  return country.shares.map((s) => s / total);
}

function companyNodes(sectorValue, list) {
  if (!list || !list.length) return [{ name: "Whole sector (no single firm dominates)", type: "rest", value: sectorValue }];
  const revenue = d3.sum(list, (c) => c[1]);
  const cap = sectorValue * MAX_COMPANY_SHARE;
  const scale = revenue > cap ? cap / revenue : 1;
  const nodes = list.map(([name, rev]) => ({ name, type: "company", value: rev * scale, revenue: rev, scaled: scale < 1 }));
  nodes.push({ name: "Rest of sector", type: "rest", value: sectorValue - revenue * scale });
  return nodes;
}

function countryNode(c) {
  const shares = sectorShares(c);
  return {
    name: c.name, flag: c.flag, type: "country",
    children: SECTORS.map((s, i) => ({
      name: s.name, type: "sector", sector: s.key,
      children: companyNodes(c.gdp * shares[i], c.cos[s.key]),
    })),
  };
}

function regionRest(region) {
  return {
    name: `Rest of ${region.name.replace(/^Other /, "")}`, type: "rest", noSectors: true,
    value: region.gdp - d3.sum(region.countries, (c) => c.gdp),
  };
}

function buildByCountry() {
  return {
    name: "World", type: "world",
    children: [
      ...COUNTRIES.map(countryNode),
      ...REGIONS.map((r) => ({ name: r.name, type: "region", children: [...r.countries.map(countryNode), regionRest(r)] })),
    ],
  };
}

function buildByIndustry() {
  const all = [...COUNTRIES, ...REGIONS.flatMap((r) => r.countries)];
  return {
    name: "World", type: "world",
    children: [
      ...SECTORS.map((s, i) => ({
        name: s.name, type: "sector", sector: s.key,
        children: all.map((c) => ({
          name: c.name, flag: c.flag, type: "country",
          children: companyNodes(c.gdp * sectorShares(c)[i], c.cos[s.key]),
        })),
      })),
      { name: "Rest of world (no industry data)", type: "region", children: REGIONS.map(regionRest) },
    ],
  };
}

// ---------- state ----------

let mode = "country";
let root, focus, svg, path, label, centerName, centerVal, centerSub, radius, colorOf;

const chartEl = document.getElementById("chart");
const tooltip = document.getElementById("tooltip");

function makeColors(r) {
  const tops = r.children;
  const palette = d3.quantize((t) => d3.interpolateRainbow(0.05 + t * 0.9), tops.length + 1);
  const base = new Map(tops.map((d, i) => [d, palette[i]]));
  return (d) => {
    if (d.depth === 0) return "transparent";
    let top = d;
    while (top.depth > 1) top = top.parent;
    const c = d3.hsl(base.get(top));
    if (d.data.type === "rest") { c.s *= 0.25; c.l = 0.55; return c.toString(); }
    if (d.depth === 1) return c.toString();
    // vary lightness among siblings so neighbours stay distinguishable
    const sibs = d.parent.children;
    const idx = sibs.indexOf(d);
    c.l = Math.min(0.82, c.l + 0.08 * (d.depth - 1) + (idx % 2 ? 0.06 : -0.02));
    return c.toString();
  };
}

function nodeId(d) { return d.ancestors().map((a) => a.data.name).reverse().join(" / "); }

// ---------- chart ----------

const arcVisible = (d) => d.y1 <= 4.001 && d.y0 >= 1 && d.x1 > d.x0;
const labelVisible = (d) => arcVisible(d) && (d.y1 - d.y0) * (d.x1 - d.x0) > 0.045;

function labelTransform(d) {
  const x = (((d.x0 + d.x1) / 2) * 180) / Math.PI;
  const y = ((d.y0 + d.y1) / 2) * radius;
  return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
}

function labelText(d) {
  const name = d.data.flag ? `${d.data.flag} ${d.data.name}` : d.data.name;
  const maxChars = Math.max(4, Math.floor(radius / 6.2));
  return name.length > maxChars ? name.slice(0, maxChars - 1) + "…" : name;
}

const arc = d3.arc()
  .startAngle((d) => d.x0)
  .endAngle((d) => d.x1)
  .padAngle((d) => Math.min((d.x1 - d.x0) / 2, 0.004))
  .padRadius(() => radius * 1.5)
  .innerRadius((d) => d.y0 * radius)
  .outerRadius((d) => Math.max(d.y0 * radius, d.y1 * radius - 1));

function render(keepFocusId) {
  const data = mode === "country" ? buildByCountry() : buildByIndustry();
  root = d3.hierarchy(data)
    .sum((d) => (d.children ? 0 : d.value || 0))
    .sort((a, b) => b.value - a.value);
  d3.partition().size([2 * Math.PI, root.height + 1])(root);
  root.each((d) => (d.current = d));
  colorOf = makeColors(root);

  const box = chartEl.getBoundingClientRect();
  const size = Math.max(320, Math.min(box.width, window.innerWidth <= 900 ? box.width : box.height || box.width));
  radius = size / 8;

  chartEl.innerHTML = "";
  svg = d3.select(chartEl).append("svg")
    .attr("viewBox", [-size / 2, -size / 2, size, size])
    .attr("width", size).attr("height", size);

  path = svg.append("g").selectAll("path")
    .data(root.descendants().slice(1))
    .join("path")
    .attr("class", "arc")
    .attr("fill", (d) => colorOf(d))
    .attr("fill-opacity", (d) => (arcVisible(d.current) ? 1 : 0))
    .attr("pointer-events", (d) => (arcVisible(d.current) ? "auto" : "none"))
    .attr("d", (d) => arc(d.current))
    .on("click", (e, d) => (d.children ? zoomTo(d) : select(d)))
    .on("mousemove", showTip)
    .on("mouseleave", hideTip);

  label = svg.append("g").attr("text-anchor", "middle")
    .selectAll("text")
    .data(root.descendants().slice(1))
    .join("text")
    .attr("class", "lbl")
    .attr("dy", "0.35em")
    .attr("fill-opacity", (d) => +labelVisible(d.current))
    .attr("transform", (d) => labelTransform(d.current))
    .text(labelText);

  const center = svg.append("g");
  center.append("circle").attr("class", "center").attr("r", radius)
    .on("click", () => focus.parent && zoomTo(focus.parent));
  centerName = center.append("text").attr("class", "center-name").attr("text-anchor", "middle").attr("dy", "-1.2em");
  centerVal = center.append("text").attr("class", "center-val").attr("text-anchor", "middle").attr("dy", "0.55em");
  centerSub = center.append("text").attr("class", "center-sub").attr("text-anchor", "middle").attr("dy", "2.6em");
  center.style("pointer-events", "none").select("circle").style("pointer-events", "all");

  fillSearch();
  const target = keepFocusId && root.descendants().find((d) => nodeId(d) === keepFocusId && d.children);
  focus = root;
  zoomTo(target || root, 0);
}

function zoomTo(p, duration = 650) {
  focus = p;
  // stretch the rings below the focus so they always fill the full disc, like a disk usage analyzer
  const k = 3 / Math.max(1, Math.min(3, p.height));
  const ry = (y) => { const r = Math.max(0, y - p.depth); return r <= 1 ? r : 1 + (r - 1) * k; };
  root.each((d) => (d.target = {
    x0: Math.max(0, Math.min(1, (d.x0 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
    x1: Math.max(0, Math.min(1, (d.x1 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
    y0: ry(d.y0),
    y1: ry(d.y1),
  }));

  const t = svg.transition().duration(duration);
  path.transition(t)
    .tween("data", (d) => {
      const i = d3.interpolate(d.current, d.target);
      return (tt) => (d.current = i(tt));
    })
    .filter(function (d) { return +this.getAttribute("fill-opacity") || arcVisible(d.target); })
    .attr("fill-opacity", (d) => (arcVisible(d.target) ? 1 : 0))
    .attr("pointer-events", (d) => (arcVisible(d.target) ? "auto" : "none"))
    .attrTween("d", (d) => () => arc(d.current));

  label.filter(function (d) { return +this.getAttribute("fill-opacity") || labelVisible(d.target); })
    .transition(t)
    .attr("fill-opacity", (d) => +labelVisible(d.target))
    .attrTween("transform", (d) => () => labelTransform(d.current));

  const name = p.data.flag ? `${p.data.flag} ${p.data.name}` : p.data.name;
  centerName.text(name.length > 22 ? name.slice(0, 21) + "…" : name);
  centerVal.text(fmt(p.value));
  centerSub.text(p.parent ? `${pct(p.value / root.value)} of world` : "nominal GDP, 2024");

  renderCrumbs();
  renderPanel(p);
}

function select(d) { renderPanel(d); }

// ---------- tooltip ----------

function describe(d) {
  const t = d.data.type;
  const lines = [];
  if (t === "company") {
    lines.push(`Revenue ${fmt(d.data.revenue)}`);
    lines.push(`${d.parent.data.name} in ${countryOf(d)}`);
  } else {
    const what = t === "sector" ? "value added" : t === "rest" ? "estimated" : "GDP";
    lines.push(`${fmt(d.value)} ${what}`);
  }
  if (d.parent) lines.push(`${pct(d.value / d.parent.value)} of ${d.parent.data.name}`);
  if (d.depth > 1) lines.push(`${pct(d.value / root.value)} of world`);
  return lines;
}

function countryOf(d) {
  const c = d.ancestors().find((a) => a.data.type === "country");
  return c ? c.data.name : "";
}

function showTip(e, d) {
  const name = d.data.flag ? `${d.data.flag} ${d.data.name}` : d.data.name;
  let html = `<div class="t">${name}</div>` + describe(d).map((l) => `<div class="m">${l}</div>`).join("");
  if (d.data.scaled) html += `<div class="w">⚠ Slice scaled down: revenue exceeds this sector's GDP contribution</div>`;
  tooltip.innerHTML = html;
  tooltip.style.opacity = 1;
  const x = Math.min(e.clientX + 14, window.innerWidth - tooltip.offsetWidth - 8);
  const y = Math.min(e.clientY + 14, window.innerHeight - tooltip.offsetHeight - 8);
  tooltip.style.left = `${x}px`;
  tooltip.style.top = `${y}px`;
}
function hideTip() { tooltip.style.opacity = 0; }

// ---------- breadcrumbs + side panel ----------

function renderCrumbs() {
  const el = document.getElementById("crumbs");
  el.innerHTML = "";
  const chain = focus.ancestors().reverse();
  chain.forEach((d, i) => {
    if (i) el.insertAdjacentHTML("beforeend", `<span class="sep">›</span>`);
    const name = d.data.flag ? `${d.data.flag} ${d.data.name}` : d.data.name;
    if (i === chain.length - 1) {
      el.insertAdjacentHTML("beforeend", `<span class="current">${name}</span>`);
    } else {
      const b = document.createElement("button");
      b.textContent = name;
      b.onclick = () => zoomTo(d);
      el.appendChild(b);
    }
  });
}

const KICKER = { world: "Global economy", country: "Economy", region: "Region", sector: "Industry", company: "Company", rest: "Remainder" };

function renderPanel(d) {
  const card = document.getElementById("focus-card");
  const name = d.data.flag ? `${d.data.flag} ${d.data.name}` : d.data.name;
  const t = d.data.type;
  const headline = t === "company" ? fmt(d.data.revenue) : fmt(d.value);
  const headLabel = t === "company" ? "annual revenue" : t === "sector" ? "value added / year" : t === "rest" ? "per year (estimate)" : "GDP / year";

  const stats = [];
  if (d.parent) stats.push(["Share of " + d.parent.data.name, pct(d.value / d.parent.value)]);
  if (d.depth > 1) stats.push(["Share of world", pct(d.value / root.value)]);
  if (t === "country" && d.children) {
    const top = d.children.slice().sort((a, b) => b.value - a.value)[0];
    stats.push(["Largest industry", top.data.name]);
  }
  if (t === "sector" && mode === "country") stats.push(["Country", countryOf(d)]);
  if (t === "company") stats.push(["Revenue vs sector", `${(d.data.revenue / d.parent.value).toFixed(2)}×`]);
  if (d.children) stats.push(["Slices", d.children.length]);

  let notes = "";
  if (t === "company" && d.data.scaled) notes += `<p class="note warn">⚠ Revenue counts every sale, including inputs bought from other firms, so it can exceed the industry's GDP contribution. This slice is scaled down to fit the ring.</p>`;
  if (d.data.noSectors) notes += `<p class="note">Industry and company detail for this economy isn't mapped yet.</p>`;
  if (t === "rest") notes += `<p class="note">Everything not listed separately: smaller firms, the self-employed, public bodies and household production.</p>`;

  card.innerHTML = `
    <div class="kicker">${KICKER[t] || ""}</div>
    <h2>${name}</h2>
    <div class="big">${headline}</div><div class="note" style="margin:0">${headLabel}</div>
    <div class="stats">${stats.map(([k, v]) => `<div class="stat"><div class="k">${k}</div><div class="v">${v}</div></div>`).join("")}</div>
    ${notes}`;

  const title = document.getElementById("list-title");
  const list = document.getElementById("child-list");
  list.innerHTML = "";
  if (!d.children) { title.textContent = ""; return; }
  title.textContent = { world: mode === "country" ? "Economies" : "Industries", country: mode === "country" ? "Industries" : "Companies", region: "Economies", sector: mode === "country" ? "Companies" : "Economies" }[t] || "Breakdown";

  const max = d.children[0].value;
  d.children.forEach((c) => {
    const li = document.createElement("li");
    const nm = c.data.flag ? `${c.data.flag} ${c.data.name}` : c.data.name;
    const val = c.data.type === "company" ? fmt(c.data.revenue) : fmt(c.value);
    li.innerHTML = `
      <span class="sw" style="background:${colorOf(c)}"></span>
      <span class="name" title="${nm}">${nm}${c.data.scaled ? " ⚠" : ""}</span>
      <span class="val">${val} · ${pct(c.value / d.value)}</span>
      <span class="bar"><i style="width:${(c.value / max) * 100}%;background:${colorOf(c)}"></i></span>`;
    li.onclick = () => (c.children ? zoomTo(c) : select(c));
    li.onmouseenter = () => path.filter((p) => p === c).attr("stroke-width", 3);
    li.onmouseleave = () => path.filter((p) => p === c).attr("stroke-width", null);
    list.appendChild(li);
  });
}

// ---------- search ----------

let searchIndex = new Map();
function fillSearch() {
  searchIndex = new Map();
  root.descendants().slice(1).forEach((d) => {
    if (d.data.type === "rest") return;
    const key = d.data.type === "company" || (d.data.type === "sector" && mode === "country") || (d.data.type === "country" && mode === "industry")
      ? `${d.data.name} — ${d.parent.data.name}`
      : d.data.name;
    if (!searchIndex.has(key)) searchIndex.set(key, d);
  });
  const dl = document.getElementById("search-list");
  dl.innerHTML = [...searchIndex.keys()].sort().map((k) => `<option value="${k.replace(/"/g, "&quot;")}">`).join("");
}

document.getElementById("search").addEventListener("change", (e) => {
  const d = searchIndex.get(e.target.value);
  if (!d) return;
  zoomTo(d.children ? d : d.parent);
  if (!d.children) select(d);
  e.target.blur();
});

// ---------- mode toggle + resize ----------

function setMode(m) {
  mode = m;
  document.getElementById("mode-country").classList.toggle("active", m === "country");
  document.getElementById("mode-industry").classList.toggle("active", m === "industry");
  document.getElementById("search").value = "";
  render();
}
document.getElementById("mode-country").onclick = () => setMode("country");
document.getElementById("mode-industry").onclick = () => setMode("industry");

let resizeTimer;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => render(focus && nodeId(focus)), 150);
});

document.getElementById("world-total").textContent = fmt(WORLD_GDP);
render();
