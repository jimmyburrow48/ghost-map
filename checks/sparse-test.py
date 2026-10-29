# Sparse-claim test (m6). Rules were written in Vault\Projects\Ghost Map.md before the data was collected.
# Claim: on real sparse networks (average links below 3), the most-linked node is often not the node whose removal
# cuts the most nodes off the largest group. A network "holds" if no most-linked node reaches the top cut.
# Control: degree-preserving rewire (10 swaps per link, seeds 1 to 20), same rule, diagnostic only.
# Usage (from the ghost-map folder): python -I checks/sparse-test.py > checks/sparse-test-out.json
import json
import networkx as nx

SOURCES = [
    ("data/florentine-families.edges", "florentine families", "breiger and pattison 1986 (as bundled in networkx)"),
    ("data/raw/power-us/power-US-Grid.mtx", "us power grid", "watts and strogatz 1998 (nrvis.com road/power collection, Pajek/USpowerGrid)"),
    ("data/raw/euroroad/road-euroroad.edges", "euroroad", "nrvis.com road-euroroad"),
    ("data/raw/minnesota/road-minnesota.mtx", "minnesota roads", "nrvis.com road-minnesota"),
]
SEEDS = range(1, 21)
SPARSE_BELOW = 3.0
MIN_NODES = 10


def load(path):
    G = nx.Graph()
    is_mtx = path.endswith(".mtx")
    header_seen = False
    with open(path, encoding="utf8") as f:
        for line in f:
            s = line.strip()
            if not s or s.startswith(("#", "%")):
                continue
            parts = s.split()
            if is_mtx and not header_seen:
                header_seen = True  # the "rows cols entries" size line
                continue
            a, b = int(parts[0]), int(parts[1])
            if a != b:
                G.add_edge(a, b)
    return G


def analyze(G):
    """Largest connected component only. cut(v) = (n-1) - size of largest group after removing v."""
    L = G.subgraph(max(nx.connected_components(G), key=len)).copy()
    n = L.number_of_nodes()
    deg = dict(L.degree())
    cut = {v: 0 for v in L}
    for v in nx.articulation_points(L):
        H = nx.restricted_view(L, [v], [])
        cut[v] = (n - 1) - max(len(c) for c in nx.connected_components(H))
    top_cut = max(cut.values())
    top_deg = max(deg.values())
    hubs = [v for v in L if deg[v] == top_deg]
    holds = all(cut[h] < top_cut for h in hubs)
    best = sorted(L, key=lambda v: (-cut[v], -deg[v], v))[0]
    return {
        "n_lcc": n,
        "links_lcc": L.number_of_edges(),
        "top_degree": top_deg,
        "hub_nodes": len(hubs),
        "hub_cuts": sorted(cut[h] for h in hubs),
        "top_cut": top_cut,
        "top_cut_node_degree": deg[best],
        "holds": holds,
        "has_cut": top_cut > 0,
    }


def rewired(G, seed):
    R = G.copy()
    nx.double_edge_swap(R, nswap=10 * G.number_of_edges(), max_tries=1000 * G.number_of_edges(), seed=seed)
    return R


out = []
for path, name, source in SOURCES:
    G = load(path)
    n_all, m_all = G.number_of_nodes(), G.number_of_edges()
    avg = 2 * m_all / n_all
    real = analyze(G)
    eligible = avg < SPARSE_BELOW and real["n_lcc"] >= MIN_NODES
    control_holds = []
    for s in SEEDS:
        r = analyze(rewired(G, s))
        control_holds.append(r["holds"])
    out.append({
        "name": name,
        "source": source,
        "file": path,
        "nodes": n_all,
        "links": m_all,
        "avg_links": round(avg, 2),
        "eligible": eligible,
        "real": real,
        "control_holds_k_of_20": sum(control_holds),
    })

print(json.dumps(out, indent=1))
