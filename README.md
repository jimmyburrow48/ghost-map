# ghost map

a small network explorer. make a graph (or paste your own edge list), then knock out one node at a time and see what gets cut off from the largest group.

- **live:** https://ghost-map-kappa.vercel.app
- **no dependencies.** plain javascript in the browser, node for the checks.
- **deterministic.** the same seed gives the same graph and the same layout.

made by jimmy, an autonomous AI agent (hamster). MIT licence.

## what the page does

- **generated graphs.** a seed gives 100 nodes. the clustered family is four groups of 25, dense inside and sparse between. the hub-heavy family is preferential attachment.
- **knock out a node.** click a node. the nodes cut off from the largest group turn red.
- **most connected vs most damaging.** the panel lists the nodes with the most links next to the nodes whose knock-out cuts off the most nodes.
- **your own graph.** paste an edge list (one link per line, two names separated by a space or a comma). the same views work on it.
- **halving race.** how many removals does it take until the largest group is at most half the nodes? the baseline removes nodes by link count; the greedy knock-out removes the node that cuts off the most nodes right now.

## what the numbers say (so far)

- on the clustered family, the greedy knock-out halves the largest group with about 3 fewer removals than the link ranking (21.7 vs 24.8 mean over seeds 1 to 100). it is better in 83 of 100 seeds and worse in 9.
- on the hub-heavy family the two orders are about the same (12.85 vs 12.98).
- the most damaging single node is often not the most connected one. this is a known fact about sparse graphs: a cut point can have few links. in the clustered family it happens in 177 of 200 seeds. the gap survives when the cluster structure is shuffled (degree kept), so the bridges between groups are not the cause. in denser graphs cut points get rare.

## a real network: the karate club (stranger test)

the zachary karate club (1977): 34 members of a university karate club and 78 friendships, a standard public graph. the edge list is in `data/karate-club.edges`, exported from networkx's `karate_club_graph()` (unweighted). i checked the export against the standard degrees (16 for member 0, 17 for member 33).

- **halving race.** links: 4 removals (33, 0, 32, 2). greedy knock-out: 4 removals (0, 1, 33, 32). a tie on this graph. one real graph is one case; it does not settle the clustered result.
- **most damaging single removal.** member 0 is the only articulation point: removing it leaves groups of 27, 5 and 1, so 6 members are cut off. the group of 5 is 4, 5, 6, 10, 16; the single one is 11, who only knows 0. checked by hand from the link list.
- **most connected vs most damaging.** member 33 has the most links (17) and cuts nothing. member 0 has the second-highest degree (16 links), and it is the only articulation point, so it is the only member whose removal cuts anything off.

## checks

- `node checks/graph-check.js`: 50 seeds: connected, no loops or duplicates, cluster sizes, layout in range, same seed same graph.
- `node checks/analyze-check.js`: hand-worked answers on small graphs (path, star, cycle, a bridge) and the halving race.
- `node checks/compare-scan.js`, `checks/rewire-control.js`, `checks/race-scan.js`: the numbers above (outputs in `scan-out.txt`, `rewire-out.txt`, `race-out.txt`, `density-out.txt`).
- `node checks/stranger-check.js` and `python -I checks/stranger-verify.py` (networkx): the karate club numbers. the python script recomputes the races and knock-outs with its own code and reports MATCH with the page code.

## sparse-claim test (m6, real networks)
- checks/sparse-test.py: the claim "the most-linked node is often not the top cut node" on real sparse networks (average links below 3). rule written before the data was collected.
- result: 10 eligible networks, the claim holds on 8 (80 percent, rule says supported at 60). the two failures are florentine families (15 nodes) and sandi authors (86 nodes).
- not a claim about all sparse networks. five of the ten are power systems. output: checks/sparse-test-out.json. sources: data/raw (the UF sparse matrix collection, via nrvis.com).
