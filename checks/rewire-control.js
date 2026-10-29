// Control for the clustered family (milestone 3, chatgpt REWORK): keep every node's degree, but progressively
// randomise which nodes are linked (double edge swaps). If the degree-vs-damage gap comes from the cluster
// bridges, it should shrink as the rewiring grows. Also checks where the most damaging nodes sit.
// Usage: node checks/rewire-control.js   (run from the ghost-map folder)
const G = require('../graph.js');
const A = require('../analyze.js');

function rewire(g, rng, frac) {
  const edges = g.edges.map(([a, b]) => [a, b]);
  const key = (a, b) => (a < b ? a + ',' + b : b + ',' + a);
  const has = new Set(edges.map(([a, b]) => key(a, b)));
  const target = Math.round(frac * edges.length * 10);
  let done = 0, tries = 0;
  while (done < target && tries < target * 20) {
    tries++;
    const i = Math.floor(rng() * edges.length), j = Math.floor(rng() * edges.length);
    if (i === j) continue;
    const [a, b] = edges[i];
    const [c0, d0] = edges[j];
    const [c, d] = rng() < 0.5 ? [c0, d0] : [d0, c0];
    if (a === d || c === b || a === c) continue;
    if (has.has(key(a, d)) || has.has(key(c, b))) continue;
    has.delete(key(a, b)); has.delete(key(c, d));
    has.add(key(a, d)); has.add(key(c, b));
    edges[i] = [Math.min(a, d), Math.max(a, d)];
    edges[j] = [Math.min(c, b), Math.max(c, b)];
    done++;
  }
  return { ...g, edges };
}

const rankOf = (a) => {
  const idx = a.map((_, i) => i).sort((x, y) => a[x] - a[y]);
  const r = new Array(a.length);
  let i = 0;
  while (i < idx.length) {
    let j = i;
    while (j + 1 < idx.length && a[idx[j + 1]] === a[idx[i]]) j++;
    for (let k = i; k <= j; k++) r[idx[k]] = (i + j) / 2 + 1;
    i = j + 1;
  }
  return r;
};

function connected(g) {
  const adj = Array.from({ length: g.n }, () => []);
  for (const [a, b] of g.edges) { adj[a].push(b); adj[b].push(a); }
  const seen = new Uint8Array(g.n); const q = [0]; seen[0] = 1;
  for (let k = 0; k < q.length; k++) for (const v of adj[q[k]]) if (!seen[v]) { seen[v] = 1; q.push(v); }
  return q.length === g.n;
}

const SEEDS = 200;
console.log('fraction of rewiring | seeds connected | gap (most damaging node is not most-linked) | mean spearman(links, cuts) | mean largest cut');
let crossShareTop = 0, crossShareAll = 0, crossLinks = 0, topCount = 0;
for (const frac of [0, 0.1, 0.5, 1]) {
  let conn = 0, gap = 0, rho = 0, maxSum = 0, used = 0;
  for (let s = 1; s <= SEEDS; s++) {
    const base = G.makeGraph(s);
    const rng = G.mulberry32(s * 7919 + 1);
    const g = frac === 0 ? base : rewire(base, rng, frac);
    if (!connected(g)) continue;
    conn++;
    const imp = A.nodeImpacts(g).map((r) => r.impact);
    const deg = A.degrees(g);
    const maxI = Math.max(...imp), maxD = Math.max(...deg);
    used++;
    maxSum += maxI;
    if (maxI > 0 && !imp.some((v, i) => v === maxI && deg[i] === maxD)) gap++;
    const rd = rankOf(deg), ri = rankOf(imp), md = (g.n + 1) / 2;
    let num = 0, dd = 0, di = 0;
    for (let i = 0; i < g.n; i++) { num += (rd[i] - md) * (ri[i] - md); dd += (rd[i] - md) ** 2; di += (ri[i] - md) ** 2; }
    rho += di === 0 ? 0 : num / Math.sqrt(dd * di);
    if (frac === 0) {
      // where do the most damaging nodes sit? share with at least one link to another cluster
      const cl = g.nodes.map((nd) => nd.cluster);
      const crossNode = new Uint8Array(g.n);
      let cross = 0;
      for (const [a, b] of g.edges) if (cl[a] !== cl[b]) { cross++; crossNode[a] = 1; crossNode[b] = 1; }
      crossLinks += cross;
      for (let i = 0; i < g.n; i++) if (imp[i] === maxI && maxI > 0) { topCount++; if (crossNode[i]) crossShareTop++; }
      for (let i = 0; i < g.n; i++) if (crossNode[i]) crossShareAll++;
    }
  }
  console.log(`${frac.toFixed(2)} | ${conn}/${SEEDS} | ${gap}/${used} | ${(rho / used).toFixed(3)} | ${(maxSum / used).toFixed(2)}`);
}
console.log(`at 0 rewiring: ${(crossLinks / SEEDS).toFixed(1)} links between clusters per graph (before the join step adds any); the most damaging nodes touch a between-cluster link in ${crossShareTop} of ${topCount} cases (${(100 * crossShareTop / topCount).toFixed(0)}%), while ${(100 * crossShareAll / (SEEDS * 100)).toFixed(0)}% of all nodes do.`);
