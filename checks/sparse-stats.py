# Second real network (Florentine families, 15 nodes, 20 links, average links about 2.7): the same race and knock-out
# definitions as checks/stranger-verify.py, with networkx's own code. Also the density-claim check on this graph.
# Usage (from the ghost-map folder): python -I checks/sparse-stats.py
import json
import networkx as nx
from scipy.stats import spearmanr

G = nx.Graph()
with open("data/florentine-families.edges", encoding="utf8") as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith("#"):
            a, b = (int(x) for x in line.split())
            G.add_edge(a, b)
N = G.number_of_nodes()
TARGET = N / 2
deg = dict(G.degree())
names = {}
with open("data/florentine-families.edges", encoding="utf8") as f:
    for line in f:
        if line.startswith("# node ids:"):
            for part in line[len("# node ids:"):].split(","):
                i, n = part.strip().split("=")
                names[int(i)] = n


def largest_after(removed):
    H = G.subgraph([v for v in G if v not in removed])
    return max((len(c) for c in nx.connected_components(H)), default=0)


def race(order):
    removed = []
    if order == "links":
        for v in sorted(G, key=lambda v: (-deg[v], v)):
            removed.append(v)
            if largest_after(set(removed)) <= TARGET:
                return len(removed), removed
        return None, removed
    for _ in range(N):
        best = None
        for v in sorted(G):
            if v in removed:
                continue
            left = N - len(removed) - 1
            imp = left - largest_after(set(removed) | {v})
            key = (imp, deg[v])
            if best is None or key > best[0]:
                best = (key, v)
        removed.append(best[1])
        if largest_after(set(removed)) <= TARGET:
            return len(removed), removed
    return None, removed


links_steps, links_order = race("links")
impact_steps, impact_order = race("impact")
knock = []
for v in G:
    L = largest_after({v})
    knock.append((N - 1 - L, v, L))
knock.sort(key=lambda t: (-t[0], t[1]))
cut = {v: c for c, v, _ in knock}
rho, _ = spearmanr([deg[v] for v in G], [cut[v] for v in G])
top_deg = max(deg.values())

result = {
    "nodes": N,
    "links": G.number_of_edges(),
    "avg_links": round(2 * G.number_of_edges() / N, 2),
    "degree_top": [(names[v], deg[v]) for v in sorted(G, key=lambda v: (-deg[v], v))[:4]],
    "halving": {
        "links": {"steps": links_steps, "order": [names[v] for v in links_order]},
        "impact": {"steps": impact_steps, "order": [names[v] for v in impact_order]},
    },
    "top_damage": [{"node": names[v], "degree": deg[v], "cut_off": c, "largest_left": L} for c, v, L in knock[:5]],
    "articulation_points": [names[v] for v in nx.articulation_points(G)],
    "spearman_degree_vs_cut": round(float(rho), 3),
    "most_linked_is_top_damage": names[max(G, key=lambda v: (deg[v], -v))] == names[knock[0][1]],
}
print(json.dumps(result, indent=2))
