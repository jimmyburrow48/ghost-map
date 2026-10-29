// Ghost Map knock-out analysis. For one node or one link removed at a time, count how many of the
// remaining nodes end up cut off from the largest connected group.
// impact = (nodes left after the knock-out) - (size of the largest group still connected)
(function (root) {
  // Connected groups after a knock-out. removedNode: index or -1. removedEdge: index into edges or -1.
  // Returns { label: per node group number (-1 for the removed node), sizes: size of each group, largest: label of the biggest group (-1 if none) }.
  function groupsAfter(n, edges, removedNode, removedEdge) {
    const adj = Array.from({ length: n }, () => []);
    edges.forEach(([a, b], i) => {
      if (i === removedEdge || a === removedNode || b === removedNode) return;
      adj[a].push(b); adj[b].push(a);
    });
    const label = new Int32Array(n).fill(-1);
    const sizes = [];
    for (let s = 0; s < n; s++) {
      if (s === removedNode || label[s] !== -1) continue;
      const id = sizes.length;
      let size = 0;
      const stack = [s]; label[s] = id;
      while (stack.length) {
        const v = stack.pop(); size++;
        for (const w of adj[v]) if (label[w] === -1) { label[w] = id; stack.push(w); }
      }
      sizes.push(size);
    }
    let largest = -1;
    sizes.forEach((size, id) => { if (largest === -1 || size > sizes[largest]) largest = id; });
    return { label, sizes, largest };
  }

  // Size of the largest connected group, ignoring removed nodes and removed links.
  function largestGroup(n, edges, removedNode, removedEdge) {
    const { sizes, largest } = groupsAfter(n, edges, removedNode, removedEdge);
    return largest === -1 ? 0 : sizes[largest];
  }

  // Impact of removing each node, in node order. Returns [{ node, impact, left, largest }].
  function nodeImpacts(g) {
    const out = [];
    for (let v = 0; v < g.n; v++) {
      const left = g.n - 1;
      const largest = largestGroup(g.n, g.edges, v, -1);
      out.push({ node: v, impact: left - largest, left, largest });
    }
    return out;
  }

  // Impact of removing each link, in edge order. Nodes stay; only the link goes. Returns [{ edge, impact, largest }].
  function linkImpacts(g) {
    const out = [];
    g.edges.forEach(([a, b], i) => {
      const largest = largestGroup(g.n, g.edges, -1, i);
      out.push({ edge: [a, b], impact: g.n - largest, largest });
    });
    return out;
  }

  // Degree of each node (number of links).
  function degrees(g) {
    const d = new Array(g.n).fill(0);
    for (const [a, b] of g.edges) { d[a]++; d[b]++; }
    return d;
  }

  // Largest group when every node flagged in `removed` (Uint8Array) is gone.
  function largestWithout(n, edges, removed) {
    const adj = Array.from({ length: n }, () => []);
    for (const [a, b] of edges) {
      if (removed[a] || removed[b]) continue;
      adj[a].push(b); adj[b].push(a);
    }
    const seen = new Uint8Array(n);
    let best = 0;
    for (let s = 0; s < n; s++) {
      if (removed[s] || seen[s]) continue;
      let size = 0;
      const stack = [s]; seen[s] = 1;
      while (stack.length) {
        const v = stack.pop(); size++;
        for (const w of adj[v]) if (!seen[w]) { seen[w] = 1; stack.push(w); }
      }
      if (size > best) best = size;
    }
    return best;
  }

  // Removal race to halve the graph. Start with every node, then remove one node at a time until the largest
  // group is at most half of the original size (or nothing is left). Two orders:
  //   'links':  the static degree ranking (most links first), the naive baseline
  //   'impact': greedy knock-out, each step removes the node that cuts off the most nodes right now
  // Returns { order: node indices in removal order, steps: how many removals it took (or null if never halved) }.
  function halvingRace(g, order) {
    const n = g.n, target = n / 2;
    const removed = new Uint8Array(n);
    const removedOrder = [];
    const deg = degrees(g);
    const staticOrder = [...deg.keys()].sort((a, b) => deg[b] - deg[a] || a - b);
    let steps = null;
    for (let step = 1; step <= n; step++) {
      let pick = -1;
      if (order === 'links') {
        pick = staticOrder.find((i) => !removed[i]);
      } else {
        // impact now: nodes outside the largest group after removing candidate v (ties: more links, then lower index)
        const left = n - (removedOrder.length) - 1;
        let bestImp = -1, bestDeg = -1;
        for (let v = 0; v < n; v++) {
          if (removed[v]) continue;
          removed[v] = 1;
          const imp = left - largestWithout(n, g.edges, removed);
          removed[v] = 0;
          if (imp > bestImp || (imp === bestImp && deg[v] > bestDeg)) { bestImp = imp; bestDeg = deg[v]; pick = v; }
        }
      }
      if (pick === -1) break;
      removed[pick] = 1;
      removedOrder.push(pick);
      if (largestWithout(n, g.edges, removed) <= target) { steps = step; break; }
    }
    return { order: removedOrder, steps };
  }

  const api = { groupsAfter, largestGroup, nodeImpacts, linkImpacts, degrees, largestWithout, halvingRace };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GhostAnalyze = api;
})(typeof window !== 'undefined' ? window : globalThis);
