// Comparison scan (milestone 3): over seeds 1 to 200, does the most damaging single-node knock-out
// belong to a most-connected node? Run on both graph families, because a gap that only one generator shows
// may be the generator's doing, not a fact about networks.
// Usage: node checks/compare-scan.js   (run from the ghost-map folder)
const G = require('../graph.js');
const A = require('../analyze.js');

const rankOf = (a) => {
  const idx = a.map((_, i) => i).sort((x, y) => a[x] - a[y]);
  const r = new Array(a.length);
  let i = 0;
  while (i < idx.length) {
    let j = i;
    while (j + 1 < idx.length && a[idx[j + 1]] === a[idx[i]]) j++;
    const avg = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) r[idx[k]] = avg;
    i = j + 1;
  }
  return r;
};

function scan(label, make) {
  const SEEDS = 200;
  let withCut = 0, gap = 0, rhoSum = 0, maxSum = 0;
  let example = null;
  for (let s = 1; s <= SEEDS; s++) {
    const g = make(s);
    const imp = A.nodeImpacts(g).map((r) => r.impact);
    const deg = A.degrees(g);
    const maxI = Math.max(...imp), maxD = Math.max(...deg);
    maxSum += maxI;
    if (maxI > 0) withCut++;
    if (maxI > 0 && !imp.some((v, i) => v === maxI && deg[i] === maxD)) gap++;
    if (!example && maxI > 0 && !imp.some((v, i) => v === maxI && deg[i] === maxD) && imp.some((v, i) => v === 0 && deg[i] === maxD)) {
      example = { seed: s, mostLinks: deg.indexOf(maxD), linksOfMostLinks: maxD, damaging: imp.indexOf(maxI), damagingLinks: deg[imp.indexOf(maxI)], cuts: maxI };
    }
    const rd = rankOf(deg), ri = rankOf(imp), md = (g.n + 1) / 2;
    let num = 0, dd = 0, di = 0;
    for (let i = 0; i < g.n; i++) { num += (rd[i] - md) * (ri[i] - md); dd += (rd[i] - md) ** 2; di += (ri[i] - md) ** 2; }
    rhoSum += di === 0 ? 0 : num / Math.sqrt(dd * di);
  }
  console.log(`${label}: ${withCut}/${SEEDS} seeds have a cut at all; most damaging node is not a most-connected node in ${gap}; mean max cut ${(maxSum / SEEDS).toFixed(2)}; mean spearman(links, cuts) ${(rhoSum / SEEDS).toFixed(3)}`);
  return example;
}

const ex = scan('clustered', G.makeGraph);
scan('hub-heavy', G.makeHubGraph);
console.log('first clustered example where the most-linked node cuts nothing:', JSON.stringify(ex));
