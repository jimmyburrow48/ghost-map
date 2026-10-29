// Analysis check: hand-worked answers on small graphs, then sanity on 20 generated graphs.
// Usage: node checks/analyze-check.js  (run from the ghost-map folder)
const { makeGraph } = require('../graph.js');
const { nodeImpacts, linkImpacts, degrees } = require('../analyze.js');

let fails = 0;
const eq = (label, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fails++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}: got ${JSON.stringify(got)}${ok ? '' : ', want ' + JSON.stringify(want)}`);
};
const g = (n, edges) => ({ n, edges });

// path 0-1-2-3-4. removing 2 cuts {0,1} from {3,4}: 2 nodes cut off. removing an end node cuts nothing.
const path = g(5, [[0, 1], [1, 2], [2, 3], [3, 4]]);
eq('path: node impacts', nodeImpacts(path).map((r) => r.impact), [0, 1, 2, 1, 0]);
eq('path: link impacts', linkImpacts(path).map((r) => r.impact), [1, 2, 2, 1]);

// star: centre 0 with 4 leaves. removing the centre leaves 4 isolated leaves (largest group 1, impact 3).
const star = g(5, [[0, 1], [0, 2], [0, 3], [0, 4]]);
eq('star: node impacts', nodeImpacts(star).map((r) => r.impact), [3, 0, 0, 0, 0]);
eq('star: degrees', degrees(star), [4, 1, 1, 1, 1]);

// cycle of 4: no single node or link cut disconnects anything.
const cycle = g(4, [[0, 1], [1, 2], [2, 3], [0, 3]]);
eq('cycle: node impacts', nodeImpacts(cycle).map((r) => r.impact), [0, 0, 0, 0]);
eq('cycle: link impacts', linkImpacts(cycle).map((r) => r.impact), [0, 0, 0, 0]);

// two triangles joined by one bridge 2-3: the bridge is the only link whose removal splits the graph (3 vs 3).
const bridge = g(6, [[0, 1], [1, 2], [0, 2], [2, 3], [3, 4], [4, 5], [3, 5]]);
const bl = linkImpacts(bridge).map((r) => r.impact);
eq('bridge: only the 2-3 link splits it', bl, [0, 0, 0, 3, 0, 0, 0]);

// halving race on the path (n = 5, halved means the largest group must be at most 2.5 nodes):
// the impact order removes the centre first (one removal). the static degree order removes node 1, then node 2 (two removals).
const hr = require('../analyze.js');
eq('path: impact race steps', hr.halvingRace(path, 'impact').steps, 1);
eq('path: links race steps', hr.halvingRace(path, 'links').steps, 2);
eq('path: impact race order', hr.halvingRace(path, 'impact').order, [2]);
eq('path: links race order', hr.halvingRace(path, 'links').order, [1, 2]);
// a cycle never halves by one removal: after one removal it is a path of 3 (largest 3 > 2) -> needs two removals either way.
eq('cycle: impact race steps', hr.halvingRace(cycle, 'impact').steps, 2);

let zeroNodeImpact = 0, withCut = 0;
for (let seed = 1; seed <= 20; seed++) {
  const gr = makeGraph(seed);
  const imp = nodeImpacts(gr).map((r) => r.impact);
  if (imp.some((v) => v < 0 || v > gr.n - 2)) { fails++; console.log(`FAIL seed ${seed}: impact out of range`); }
  if (imp.some((v) => v > 0)) withCut++;
  zeroNodeImpact += imp.filter((v) => v === 0).length;
}
console.log(`ok   generated graphs: ${withCut} of 20 have a node whose removal cuts something off; ${zeroNodeImpact} node knock-outs of 2000 cut nothing`);
console.log(fails ? `${fails} failures` : 'all analysis checks pass');
process.exit(fails ? 1 : 0);
