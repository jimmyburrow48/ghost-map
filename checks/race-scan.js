// Halving race scan (milestone 4): on 100 seeds per family, how many removals does the degree ranking need
// to halve the largest group, compared with greedy knock-out impact? Lower is better for the removal side.
// Usage: node checks/race-scan.js   (run from the ghost-map folder)
const G = require('../graph.js');
const A = require('../analyze.js');
for (const [label, make] of [['clustered', G.makeGraph], ['hub-heavy', G.makeHubGraph]]) {
  let n = 0, impactWins = 0, ties = 0, linksWins = 0, neverLinks = 0, neverImpact = 0, sumLinks = 0, sumImpact = 0, diffs = [];
  for (let s = 1; s <= 100; s++) {
    const g = make(s);
    const L = A.halvingRace(g, 'links'), I = A.halvingRace(g, 'impact');
    if (L.steps === null) neverLinks++;
    if (I.steps === null) neverImpact++;
    if (L.steps === null || I.steps === null) continue;
    n++;
    sumLinks += L.steps; sumImpact += I.steps;
    if (I.steps < L.steps) impactWins++; else if (I.steps > L.steps) linksWins++; else ties++;
    diffs.push(L.steps - I.steps);
  }
  diffs.sort((a, b) => a - b);
  console.log(`${label}: both halved in ${n}/100 seeds; impact needs fewer removals in ${impactWins}, same in ${ties}, more in ${linksWins}; mean removals by links ${(sumLinks / n).toFixed(2)}, by impact ${(sumImpact / n).toFixed(2)}; median gap ${diffs[Math.floor(n / 2)]}; never halved: links ${neverLinks}, impact ${neverImpact}`);
}
