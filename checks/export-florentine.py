# Export the Florentine families graph (15 families, 20 ties) from networkx to data/florentine-families.edges.
# Source: Breiger and Pattison (1986), Social Networks 8(3): 215-256, as bundled by networkx (florentine_families_graph).
# Usage (from the ghost-map folder): python -I checks/export-florentine.py
import networkx as nx

G = nx.florentine_families_graph()
names = sorted(G.nodes())
idx = {name: i for i, name in enumerate(names)}
with open("data/florentine-families.edges", "w", encoding="utf8") as f:
    f.write("# Florentine families (Breiger and Pattison 1986, Social Networks 8(3): 215-256), as bundled in networkx.\n")
    f.write("# marriage and business ties, unweighted, 15 families, 20 links. exported by checks/export-florentine.py.\n")
    f.write("# node ids: " + ", ".join(f"{i}={n}" for n, i in idx.items()) + "\n")
    for a, b in sorted(G.edges(), key=lambda e: (idx[e[0]], idx[e[1]])):
        lo, hi = sorted((idx[a], idx[b]))
        f.write(f"{lo} {hi}\n")
print(G.number_of_nodes(), G.number_of_edges())
