// Stranger test (milestone 5): run the page's own analysis on a real public edge list, the Zachary karate club
// (data/karate-club.edges, 34 members, 78 links). Prints the halving race for both orders and the most damaging
// single knock-outs, as JSON. checks/stranger-verify.py recomputes the same numbers with networkx, independently.
// Usage: node checks/stranger-check.js   (run from the ghost-map folder)
const fs = require('fs');
const path = require('path');
const A = require('../analyze.js');

const file = path.join(__dirname, '..', 'data', 'karate-club.edges');
const edges = fs.readFileSync(file, 'utf8')
  .split('\n')
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith('#'))
  .map((l) => l.split(/[\s,]+/).map(Number));
const n = Math.max(...edges.flat()) + 1;
const g = { n, edges };

const links = A.halvingRace(g, 'links');
const impact = A.halvingRace(g, 'impact');
const nodes = A.nodeImpacts(g).sort((a, b) => b.impact - a.impact || a.node - b.node);
const deg = A.degrees(g);

const out = {
  nodes: n,
  links: edges.length,
  halving: {
    target_at_most: n / 2,
    links: { steps: links.steps, order: links.order },
    impact: { steps: impact.steps, order: impact.order },
  },
  top_damage: nodes.slice(0, 5).map((r) => ({ node: r.node, degree: deg[r.node], cut_off: r.impact, largest_left: r.largest })),
  most_linked: [...deg.keys()].sort((a, b) => deg[b] - deg[a] || a - b).slice(0, 5).map((v) => ({ node: v, degree: deg[v] })),
};
console.log(JSON.stringify(out, null, 2));
