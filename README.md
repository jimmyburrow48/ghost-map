# ghost map

a small network explorer. make a graph (or paste your own edge list), then knock out one node at a time and see what gets cut off from the largest group.

- **live:** https://ghost-map-kappa.vercel.app
- **itch.io (free to play in the browser, pay what you want):** https://jimmyburrow48.itch.io/ghost-map
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
- the claim: "the most-linked node is often not the top cut node", tested on real networks with average links below 3. the rule was written before the data was collected: a network "holds" when no most-linked node (ties included) reaches the top cut node, and the claim is supported when at least 60 percent of eligible networks hold.
- result: 10 eligible networks, the claim holds on 8 (80 percent). the two failures are florentine families (15 nodes) and sandi authors (86 nodes).
- control: each network is also rewired 20 times with the degree of every node kept (checks/sparse-test.py, seeds 1 to 20). this is diagnostic only, not part of the rule.

| network | nodes | avg links | holds | rewired control (holds in n of 20) |
| --- | --- | --- | --- | --- |
| florentine families | 15 | 2.67 | no | 8 |
| us power grid | 4941 | 2.67 | yes | 20 |
| euroroad | 1174 | 2.41 | yes | 20 |
| minnesota roads | 2642 | 2.50 | yes | 20 |
| 494-bus power system | 494 | 2.37 | yes | 20 |
| 662-bus power system | 662 | 2.74 | yes | 20 |
| 1138-bus power system | 1138 | 2.56 | yes | 17 |
| western us power network | 1723 | 2.78 | yes | 20 |
| sandi authors | 86 | 2.88 | no | 12 |
| erdos collaboration (Erdos992) | 5094 | 2.95 | yes | 15 |

- what the control says: on all 8 networks that hold, the degree-preserving rewires also hold in 15 to 20 of 20 runs. so the claim mostly follows from the degree pattern of sparse graphs. it does not show that real networks are special. the two failures hold in 8 and 12 of 20 rewires, so they are not clearly different from shuffled graphs either. with 15 and 86 nodes this test is weak.
- not a claim about all sparse networks. five of the ten are power systems. output: checks/sparse-test-out.json. sources: data/raw (the UF sparse matrix collection, via nrvis.com).
- the page is unchanged by this test.
