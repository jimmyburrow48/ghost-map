// Ghost Map graph generator. A seed always gives the same graph and the same layout.
// Shape: nodes split into clusters (dense inside, sparse between), so a few links carry most of the structure.
// Every graph is connected: stray components are joined with seeded extra links.
(function (root) {
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function makeGraph(seed, opts) {
    opts = opts || {};
    const n = opts.n || 100;
    const clusters = opts.clusters || 4;
    const pIn = opts.pIn || 0.12;   // link chance inside a cluster
    const pOut = opts.pOut || 0.01; // link chance between clusters
    const rng = mulberry32(seed);

    const nodes = [];
    for (let i = 0; i < n; i++) nodes.push({ id: i, cluster: i % clusters });

    const edges = [];
    const seen = new Set();
    const add = (a, b) => {
      if (a === b) return false;
      const lo = Math.min(a, b), hi = Math.max(a, b);
      const key = lo * n + hi;
      if (seen.has(key)) return false;
      seen.add(key);
      edges.push([lo, hi]);
      return true;
    };
    for (let a = 0; a < n; a++) {
      for (let b = a + 1; b < n; b++) {
        const p = nodes[a].cluster === nodes[b].cluster ? pIn : pOut;
        if (rng() < p) add(a, b);
      }
    }

    // Join stray components: each one gets one seeded link to the main component (the one with node 0).
    const parent = nodes.map((_, i) => i);
    const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
    for (const [a, b] of edges) parent[find(a)] = find(b);
    for (let i = 1; i < n; i++) {
      const main = find(0), other = find(i);
      if (other === main) continue;
      const mainMembers = [], otherMembers = [];
      for (let j = 0; j < n; j++) {
        if (find(j) === main) mainMembers.push(j);
        else if (find(j) === other) otherMembers.push(j);
      }
      const a = mainMembers[Math.floor(rng() * mainMembers.length)];
      const b = otherMembers[Math.floor(rng() * otherMembers.length)];
      add(a, b);
      parent[other] = main;
    }

    const layout = layoutGraph(nodes, edges, rng, clusters);
    return { seed, n, clusters, nodes, edges, pos: layout };
  }

  // Second family, for the comparison: preferential attachment (hub-heavy). Each new node links to m older nodes,
  // picked in proportion to their degree. Connected by construction. Same output shape as makeGraph.
  function makeHubGraph(seed, opts) {
    opts = opts || {};
    const n = opts.n || 100;
    const m = opts.m || 2;
    const rng = mulberry32(seed);
    const nodes = [];
    for (let i = 0; i < n; i++) nodes.push({ id: i, cluster: 0 }); // no clusters in this family
    const edges = [];
    const ends = []; // every link end, so a random pick is proportional to degree
    const seen = new Set();
    const add = (a, b) => {
      const lo = Math.min(a, b), hi = Math.max(a, b);
      if (lo === hi || seen.has(lo * n + hi)) return false;
      seen.add(lo * n + hi);
      edges.push([lo, hi]); ends.push(lo, hi);
      return true;
    };
    for (let i = 1; i <= m; i++) add(0, i); // seed core: a star on the first m+1 nodes
    for (let v = m + 1; v < n; v++) {
      let made = 0, guard = 0;
      while (made < m && guard++ < 1000) {
        const target = ends[Math.floor(rng() * ends.length)];
        if (add(v, target)) made++;
      }
    }
    const pos = layoutGraph(nodes, edges, rng, 4);
    return { seed, n, clusters: 4, nodes, edges, pos, family: 'hub' };
  }

  // Fruchterman-Reingold style force layout, seeded start on a ring per cluster. Output: positions in [0, 1].
  function layoutGraph(nodes, edges, rng, clusters) {
    const n = nodes.length;
    const x = new Float64Array(n), y = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const c = nodes[i].cluster;
      const ang = (c / clusters) * Math.PI * 2 + 0.6;
      x[i] = 0.5 + 0.28 * Math.cos(ang) + (rng() - 0.5) * 0.12;
      y[i] = 0.5 + 0.28 * Math.sin(ang) + (rng() - 0.5) * 0.12;
    }
    const k = Math.sqrt(1 / n);
    let temp = 0.1;
    const dx = new Float64Array(n), dy = new Float64Array(n);
    for (let it = 0; it < 300; it++) {
      dx.fill(0); dy.fill(0);
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          const ex = x[i] - x[j], ey = y[i] - y[j];
          const d2 = ex * ex + ey * ey + 1e-6;
          const rep = (k * k) / d2;
          dx[i] += ex * rep; dy[i] += ey * rep;
          dx[j] -= ex * rep; dy[j] -= ey * rep;
        }
      }
      for (const [a, b] of edges) {
        const ex = x[a] - x[b], ey = y[a] - y[b];
        const d = Math.sqrt(ex * ex + ey * ey) + 1e-6;
        const att = (d * d) / k;
        dx[a] -= (ex / d) * att; dy[a] -= (ey / d) * att;
        dx[b] += (ex / d) * att; dy[b] += (ey / d) * att;
      }
      for (let i = 0; i < n; i++) {
        const d = Math.sqrt(dx[i] * dx[i] + dy[i] * dy[i]) + 1e-9;
        const step = Math.min(d, temp);
        x[i] += (dx[i] / d) * step;
        y[i] += (dy[i] / d) * step;
      }
      temp *= 0.985;
    }
    // Fit into [0.04, 0.96] on both axes (keeps the aspect ratio of the layout).
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (let i = 0; i < n; i++) {
      minX = Math.min(minX, x[i]); maxX = Math.max(maxX, x[i]);
      minY = Math.min(minY, y[i]); maxY = Math.max(maxY, y[i]);
    }
    const span = Math.max(maxX - minX, maxY - minY) || 1;
    const pos = [];
    for (let i = 0; i < n; i++) pos.push([0.04 + 0.92 * (x[i] - minX) / span, 0.04 + 0.92 * (y[i] - minY) / span]);
    return pos;
  }

  // A graph from an edge list you paste. labels: the names as written; pairs: [[labelA, labelB], ...].
  // Duplicates and self-loops are dropped. Drawn with the same seeded layout (seed 1).
  function fromEdges(pairs, maxNodes) {
    maxNodes = maxNodes || 400;
    const index = new Map(), labels = [];
    const id = (name) => {
      if (!index.has(name)) { index.set(name, labels.length); labels.push(name); }
      return index.get(name);
    };
    const seen = new Set(), edges = [];
    for (const [x, y] of pairs) {
      if (x === y) continue;
      const a = id(x), b = id(y);
      if (labels.length > maxNodes) throw new Error(`more than ${maxNodes} nodes`);
      const lo = Math.min(a, b), hi = Math.max(a, b);
      if (seen.has(lo + ',' + hi)) continue;
      seen.add(lo + ',' + hi);
      edges.push([lo, hi]);
    }
    const n = labels.length;
    if (n < 2) throw new Error('need at least two nodes and one link');
    const nodes = labels.map((_, i) => ({ id: i, cluster: 0 }));
    const pos = layoutGraph(nodes, edges, mulberry32(1), 1);
    return { seed: 'pasted', n, nodes, edges, pos, labels };
  }

  const api = { mulberry32, makeGraph, makeHubGraph, fromEdges };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GhostGraph = api;
})(typeof window !== 'undefined' ? window : globalThis);
