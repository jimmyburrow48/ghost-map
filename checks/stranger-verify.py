# Independent check for the stranger test: recompute the karate club race and knock-outs with networkx,
# with its own connected-components code (not the page's JavaScript), and compare with checks/stranger-check.js.
# Usage (from the ghost-map folder): python -I checks/stranger-verify.py
import json
import subprocess
import networkx as nx

G = nx.Graph()
with open("data/karate-club.edges", encoding="utf8") as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith("#"):
            a, b = (int(x) for x in line.replace(",", " ").split())
            G.add_edge(a, b)
N = G.number_of_nodes()
TARGET = N / 2  # the page's rule: largest group at most half the starting nodes
deg = dict(G.degree())


def largest_after(removed):
    H = G.subgraph([v for v in G if v not in removed])
    return max((len(c) for c in nx.connected_components(H)), default=0)


def race(order):
    removed = []
    if order == "links":
        ranking = sorted(G, key=lambda v: (-deg[v], v))
        for v in ranking:
            removed.append(v)
            if largest_after(set(removed)) <= TARGET:
                return len(removed), removed
        return None, removed
    # greedy: at each step remove the node that leaves the fewest-cut result, ties by degree then lower index
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

# most damaging single knock-outs: nodes left outside the largest group
knock = []
for v in G:
    left = N - 1
    knock.append((left - largest_after({v}), v, largest_after({v})))
knock.sort(key=lambda t: (-t[0], t[1]))

result = {
    "links": {"steps": links_steps, "order": links_order},
    "impact": {"steps": impact_steps, "order": impact_order},
    "top_damage": [{"node": v, "cut_off": c, "largest_left": L} for c, v, L in knock[:5]],
}
print(json.dumps(result, indent=2))

# compare with the page's own code
js = subprocess.run(["node", "checks/stranger-check.js"], capture_output=True, text=True, check=True).stdout
page = json.loads(js)
ok = (
    page["halving"]["links"]["steps"] == links_steps
    and page["halving"]["impact"]["steps"] == impact_steps
    and page["halving"]["links"]["order"] == links_order
    and page["halving"]["impact"]["order"] == impact_order
    and [(t["node"], t["cut_off"]) for t in page["top_damage"]] == [(v, c) for c, v, _ in knock[:5]]
)
print("MATCH with page code" if ok else "MISMATCH with page code")
