// Graph check: for 50 seeds, the generator must give a connected graph of 100 nodes with no self-loops,
// no duplicate links, cluster sizes of 25, positions inside [0, 1], and the same output for the same seed.
// Usage: node checks/graph-check.js  (run from the ghost-map folder)
const { makeGraph } = require('../graph.js');

let fails = 0;
const fail = (msg) => { console.log('FAIL ' + msg); fails++; };
const edgeCount = [];

for (let seed = 1; seed <= 50; seed++) {
  const g = makeGraph(seed);
  const tag = `seed ${seed}`;
  if (g.n !== 100 || g.nodes.length !== 100 || g.pos.length !== 100) fail(`${tag}: node count ${g.nodes.length}`);

  const keys = new Set();
  for (const [a, b] of g.edges) {
    if (a === b) fail(`${tag}: self-loop at ${a}`);
    const k = a + ',' + b;
    if (keys.has(k)) fail(`${tag}: duplicate link ${k}`);
    keys.add(k);
    if (!(a < b)) fail(`${tag}: link ${k} not stored low to high`);
  }
  edgeCount.push(g.edges.length);

  const adj = Array.from({ length: g.n }, () => []);
  for (const [a, b] of g.edges) { adj[a].push(b); adj[b].push(a); }
  const seen = new Uint8Array(g.n);
  const queue = [0]; seen[0] = 1;
  for (let q = 0; q < queue.length; q++) for (const v of adj[queue[q]]) if (!seen[v]) { seen[v] = 1; queue.push(v); }
  if (queue.length !== g.n) fail(`${tag}: only ${queue.length} of ${g.n} nodes reachable from node 0`);

  const sizes = [0, 0, 0, 0];
  for (const nd of g.nodes) sizes[nd.cluster]++;
  if (sizes.some((s) => s !== 25)) fail(`${tag}: cluster sizes ${sizes}`);

  for (const [x, y] of g.pos) if (!(x >= 0 && x <= 1 && y >= 0 && y <= 1) || Number.isNaN(x) || Number.isNaN(y)) { fail(`${tag}: position out of range`); break; }

  if (JSON.stringify(makeGraph(seed)) !== JSON.stringify(g)) fail(`${tag}: same seed gave a different graph`);
}

if (JSON.stringify(makeGraph(1).edges) === JSON.stringify(makeGraph(2).edges)) fail('seeds 1 and 2 gave the same links');

const min = Math.min(...edgeCount), max = Math.max(...edgeCount);
console.log(`links per graph: ${min} to ${max} (50 seeds)`);
console.log(fails ? `${fails} failures` : 'all 50 seeds pass: connected, no loops or duplicates, clusters of 25, layout in range, repeatable');
process.exit(fails ? 1 : 0);
