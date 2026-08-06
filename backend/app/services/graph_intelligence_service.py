"""
Graph Intelligence Service for Neuro.
Extracts knowledge graphs from codebases, notes, and schemas, performs community
clustering, God node centrality analysis, blast radius / impact analysis, and
Wikipedia-style markdown wiki generation.
"""

from __future__ import annotations

import ast
import os
import re
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any

import networkx as nx

# Extensions supported for knowledge graph extraction
CODE_EXTENSIONS = {".py", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".rs", ".go", ".sql", ".json", ".yaml", ".yml"}
DOC_EXTENSIONS = {".md", ".mdx", ".txt", ".org"}

IGNORE_DIRS = {
    ".git",
    ".venv",
    "venv",
    "node_modules",
    "__pycache__",
    ".next",
    "dist",
    "build",
    ".turbo",
    ".pytest_cache",
    ".gemini",
}

BUILTIN_NOISE_LABELS = {
    "str",
    "int",
    "float",
    "bool",
    "bytes",
    "dict",
    "list",
    "set",
    "tuple",
    "None",
    "True",
    "False",
    "object",
    "type",
    "Any",
    "Optional",
    "Union",
    "List",
    "Dict",
    "Set",
    "Tuple",
    "Callable",
    "Path",
    "print",
    "len",
}


@dataclass
class GraphNode:
    id: str
    label: str
    type: str  # "file", "function", "class", "component", "endpoint", "note", "concept"
    source_file: str | None = None
    source_location: str | None = None
    docstring: str | None = None
    community: int | None = None
    properties: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {k: v for k, v in asdict(self).items() if v is not None}


@dataclass
class GraphEdge:
    source: str
    target: str
    relation: str  # "calls", "imports", "defines", "inherits", "renders", "links_to", "depends_on"
    confidence: str = "EXTRACTED"  # "EXTRACTED", "INFERRED", "AMBIGUOUS"
    weight: float = 1.0
    properties: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class AffectedNodeHit:
    node_id: str
    label: str
    depth: int
    via_relation: str
    source_file: str | None = None
    source_location: str | None = None


@dataclass
class GraphAnalyticsResult:
    total_nodes: int
    total_edges: int
    density: float
    communities_count: int
    communities: dict[int, dict[str, Any]]
    god_nodes: list[dict[str, Any]]
    circular_dependencies: list[list[str]]
    bridge_nodes: list[str]
    isolated_nodes: list[str]


class CodebaseGraphExtractor:
    """Extracts semantic knowledge graph nodes and edges from repository files."""

    @staticmethod
    def extract_from_directory(root_path: str, max_files: int = 500) -> dict[str, Any]:
        root = Path(root_path).resolve()
        if not root.exists() or not root.is_dir():
            raise ValueError(f"Directory path does not exist: {root_path}")

        nodes: dict[str, GraphNode] = {}
        edges: list[GraphEdge] = []
        files_scanned = 0

        for current_root, dirs, files in os.walk(root):
            # Prune ignored directories
            dirs[:] = [d for d in dirs if d not in IGNORE_DIRS and not d.startswith(".")]

            for file in files:
                if files_scanned >= max_files:
                    break

                file_path = Path(current_root) / file
                ext = file_path.suffix.lower()
                rel_path = str(file_path.relative_to(root)).replace("\\", "/")

                if ext in CODE_EXTENSIONS or ext in DOC_EXTENSIONS:
                    file_node_id = f"file:{rel_path}"
                    nodes[file_node_id] = GraphNode(
                        id=file_node_id,
                        label=file,
                        type="file",
                        source_file=rel_path,
                        source_location="L1",
                        properties={"extension": ext, "size_bytes": file_path.stat().st_size},
                    )
                    files_scanned += 1

                    try:
                        raw_content = file_path.read_text(encoding="utf-8", errors="ignore")
                    except Exception:
                        continue

                    if ext == ".py":
                        CodebaseGraphExtractor._extract_python(file_node_id, rel_path, raw_content, nodes, edges)
                    elif ext in {".ts", ".tsx", ".js", ".jsx", ".mjs"}:
                        CodebaseGraphExtractor._extract_javascript_typescript(
                            file_node_id, rel_path, raw_content, nodes, edges
                        )
                    elif ext in DOC_EXTENSIONS:
                        CodebaseGraphExtractor._extract_markdown(file_node_id, rel_path, raw_content, nodes, edges)

        return {
            "root_path": str(root),
            "files_scanned": files_scanned,
            "nodes": [n.to_dict() for n in nodes.values()],
            "edges": [e.to_dict() for e in edges],
        }

    @staticmethod
    def _extract_python(
        file_node_id: str, rel_path: str, content: str, nodes: dict[str, GraphNode], edges: list[GraphEdge]
    ) -> None:
        try:
            tree = ast.parse(content)
        except SyntaxError:
            return

        for stmt in tree.body:
            # Imports
            if isinstance(stmt, ast.Import):
                for alias in stmt.names:
                    imp_id = f"pkg:{alias.name}"
                    if imp_id not in nodes:
                        nodes[imp_id] = GraphNode(id=imp_id, label=alias.name, type="package")
                    edges.append(GraphEdge(source=file_node_id, target=imp_id, relation="imports"))

            elif isinstance(stmt, ast.ImportFrom):
                module = stmt.module or ""
                for alias in stmt.names:
                    imp_id = f"import:{module}.{alias.name}" if module else f"import:{alias.name}"
                    if imp_id not in nodes:
                        nodes[imp_id] = GraphNode(id=imp_id, label=alias.name, type="symbol", source_file=module)
                    edges.append(GraphEdge(source=file_node_id, target=imp_id, relation="imports"))

            # Top-level Functions
            elif isinstance(stmt, (ast.FunctionDef, ast.AsyncFunctionDef)):
                fn_id = f"{rel_path}:{stmt.name}()"
                doc = ast.get_docstring(stmt)
                nodes[fn_id] = GraphNode(
                    id=fn_id,
                    label=f"{stmt.name}()",
                    type="function",
                    source_file=rel_path,
                    source_location=f"L{stmt.lineno}",
                    docstring=doc,
                    properties={"is_async": isinstance(stmt, ast.AsyncFunctionDef)},
                )
                edges.append(GraphEdge(source=file_node_id, target=fn_id, relation="defines"))

                # Function body calls
                CodebaseGraphExtractor._extract_python_calls(fn_id, stmt, edges)

            # Classes
            elif isinstance(stmt, ast.ClassDef):
                cls_id = f"{rel_path}:{stmt.name}"
                doc = ast.get_docstring(stmt)
                nodes[cls_id] = GraphNode(
                    id=cls_id,
                    label=stmt.name,
                    type="class",
                    source_file=rel_path,
                    source_location=f"L{stmt.lineno}",
                    docstring=doc,
                )
                edges.append(GraphEdge(source=file_node_id, target=cls_id, relation="defines"))

                # Base inheritance
                for base in stmt.bases:
                    if isinstance(base, ast.Name):
                        base_id = f"symbol:{base.id}"
                        if base_id not in nodes:
                            nodes[base_id] = GraphNode(id=base_id, label=base.id, type="class")
                        edges.append(GraphEdge(source=cls_id, target=base_id, relation="inherits"))

                # Methods inside Class
                for item in stmt.body:
                    if isinstance(item, (ast.FunctionDef, ast.AsyncFunctionDef)):
                        method_id = f"{rel_path}:{stmt.name}.{item.name}()"
                        m_doc = ast.get_docstring(item)
                        nodes[method_id] = GraphNode(
                            id=method_id,
                            label=f"{stmt.name}.{item.name}()",
                            type="method",
                            source_file=rel_path,
                            source_location=f"L{item.lineno}",
                            docstring=m_doc,
                        )
                        edges.append(GraphEdge(source=cls_id, target=method_id, relation="defines"))
                        CodebaseGraphExtractor._extract_python_calls(method_id, item, edges)

    @staticmethod
    def _extract_python_calls(caller_id: str, node: ast.AST, edges: list[GraphEdge]) -> None:
        for child in ast.walk(node):
            if isinstance(child, ast.Call):
                if isinstance(child.func, ast.Name):
                    if child.func.id not in BUILTIN_NOISE_LABELS:
                        edges.append(
                            GraphEdge(
                                source=caller_id,
                                target=f"symbol:{child.func.id}()",
                                relation="calls",
                                confidence="INFERRED",
                            )
                        )
                elif isinstance(child.func, ast.Attribute):
                    if child.func.attr not in BUILTIN_NOISE_LABELS:
                        edges.append(
                            GraphEdge(
                                source=caller_id,
                                target=f"symbol:.{child.func.attr}()",
                                relation="calls",
                                confidence="INFERRED",
                            )
                        )

    @staticmethod
    def _extract_javascript_typescript(
        file_node_id: str, rel_path: str, content: str, nodes: dict[str, GraphNode], edges: list[GraphEdge]
    ) -> None:
        # Imports: import { foo, bar } from './module'
        import_matches = re.finditer(
            r'import\s+(?:\{([^}]+)\}|\*\s+as\s+(\w+)|(\w+))\s+from\s+[\'"]([^\'"]+)[\'"]', content
        )
        for m in import_matches:
            target_path = m.group(4)
            symbols = m.group(1) or m.group(2) or m.group(3) or ""
            target_id = f"file:{target_path}"
            edges.append(GraphEdge(source=file_node_id, target=target_id, relation="imports", confidence="EXTRACTED"))
            for sym in symbols.split(","):
                sym = sym.strip()
                if sym:
                    sym_id = f"symbol:{sym}"
                    if sym_id not in nodes:
                        nodes[sym_id] = GraphNode(id=sym_id, label=sym, type="symbol", source_file=target_path)
                    edges.append(GraphEdge(source=file_node_id, target=sym_id, relation="imports"))

        # Function & Component Declarations
        fn_matches = re.finditer(r"(?:export\s+)?(?:async\s+)?function\s+([A-Za-z0-9_$]+)\s*\(", content)
        for m in fn_matches:
            name = m.group(1)
            is_comp = name[0].isupper()
            fn_id = f"{rel_path}:{name}()"
            nodes[fn_id] = GraphNode(
                id=fn_id, label=f"{name}()", type="component" if is_comp else "function", source_file=rel_path
            )
            edges.append(GraphEdge(source=file_node_id, target=fn_id, relation="defines"))

        # Arrow Functions / React Components: const MyComp = (...) => ...
        arrow_matches = re.finditer(
            r"(?:export\s+)?const\s+([A-Za-z0-9_$]+)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>", content
        )
        for m in arrow_matches:
            name = m.group(1)
            is_comp = name[0].isupper()
            fn_id = f"{rel_path}:{name}"
            nodes[fn_id] = GraphNode(
                id=fn_id, label=name, type="component" if is_comp else "function", source_file=rel_path
            )
            edges.append(GraphEdge(source=file_node_id, target=fn_id, relation="defines"))

        # Class declarations
        class_matches = re.finditer(
            r"(?:export\s+)?class\s+([A-Za-z0-9_$]+)(?:\s+extends\s+([A-Za-z0-9_$]+))?", content
        )
        for m in class_matches:
            cls_name = m.group(1)
            parent = m.group(2)
            cls_id = f"{rel_path}:{cls_name}"
            nodes[cls_id] = GraphNode(id=cls_id, label=cls_name, type="class", source_file=rel_path)
            edges.append(GraphEdge(source=file_node_id, target=cls_id, relation="defines"))
            if parent:
                parent_id = f"symbol:{parent}"
                edges.append(GraphEdge(source=cls_id, target=parent_id, relation="inherits"))

    @staticmethod
    def _extract_markdown(
        file_node_id: str, rel_path: str, content: str, nodes: dict[str, GraphNode], edges: list[GraphEdge]
    ) -> None:
        # Extract [[wikilinks]]
        wikilinks = re.findall(r"\[\[([^\]|]+)(?:\|[^\]]+)?\]\]", content)
        for wl in set(wikilinks):
            wl_clean = wl.strip()
            target_id = f"note:{wl_clean}"
            if target_id not in nodes:
                nodes[target_id] = GraphNode(id=target_id, label=wl_clean, type="note")
            edges.append(GraphEdge(source=file_node_id, target=target_id, relation="links_to", confidence="EXTRACTED"))

        # Extract markdown headers as concept nodes
        headers = re.finditer(r"^(#{1,3})\s+(.+)$", content, re.MULTILINE)
        for h in headers:
            title = h.group(2).strip()
            concept_id = f"concept:{title}"
            if concept_id not in nodes:
                nodes[concept_id] = GraphNode(id=concept_id, label=title, type="concept", source_file=rel_path)
            edges.append(GraphEdge(source=file_node_id, target=concept_id, relation="defines"))


class GraphAnalyticsEngine:
    """Performs community detection, God node analysis, blast radius, and graph diagnostics."""

    @staticmethod
    def build_networkx_graph(nodes: list[dict[str, Any]], edges: list[dict[str, Any]]) -> nx.DiGraph:
        G = nx.DiGraph()
        for n in nodes:
            node_id = n.get("id")
            if node_id:
                G.add_node(node_id, **{k: v for k, v in n.items() if k != "id"})
        for e in edges:
            source = e.get("source")
            target = e.get("target")
            if source and target:
                edge_attrs = {k: v for k, v in e.items() if k not in ("source", "target")}
                if "relation" not in edge_attrs:
                    edge_attrs["relation"] = "links_to"
                G.add_edge(source, target, **edge_attrs)
        return G

    @staticmethod
    def cluster_communities(G: nx.Graph, resolution: float = 1.0) -> dict[int, list[str]]:
        """Louvain community detection partitioned deterministically by hub label."""
        undirected = G.to_undirected() if G.is_directed() else G
        if len(undirected) == 0:
            return {}

        try:
            communities_sets = nx.community.louvain_communities(undirected, resolution=resolution, seed=42)
        except Exception:
            # Fallback to connected components if louvain fails
            communities_sets = list(nx.connected_components(undirected))

        # Sort communities by size descending for stability
        sorted_comms = sorted(communities_sets, key=len, reverse=True)
        return {cid: sorted(list(members)) for cid, members in enumerate(sorted_comms)}

    @staticmethod
    def label_communities_by_hub(G: nx.Graph, communities: dict[int, list[str]]) -> dict[int, str]:
        """Labels each community after its highest-degree structural hub."""
        labels: dict[int, str] = {}
        for cid, members in communities.items():
            if not members:
                labels[cid] = f"Community {cid}"
                continue
            # Hub is the node with highest degree in G
            hub = max(members, key=lambda n: (G.degree(n) if n in G else 0, str(n)))
            node_data = G.nodes[hub] if hub in G else {}
            hub_label = node_data.get("label") or hub
            if hub_label.endswith("()"):
                hub_label = hub_label[:-2]
            labels[cid] = f"{hub_label} Cluster" if hub_label else f"Community {cid}"
        return labels

    @staticmethod
    def find_god_nodes(G: nx.Graph, top_n: int = 10) -> list[dict[str, Any]]:
        """Finds central God nodes / architectural keystones filtered from built-ins."""
        if len(G) == 0:
            return []

        degree_dict = dict(G.degree())
        pagerank_dict = nx.pagerank(G) if len(G) > 1 else {n: 1.0 for n in G.nodes}

        ranked_nodes = sorted(degree_dict.items(), key=lambda x: (x[1], pagerank_dict.get(x[0], 0.0)), reverse=True)
        results: list[dict[str, Any]] = []

        for node_id, deg in ranked_nodes:
            data = G.nodes.get(node_id, {})
            label = data.get("label", node_id)
            if label in BUILTIN_NOISE_LABELS:
                continue

            results.append(
                {
                    "id": node_id,
                    "label": label,
                    "type": data.get("type", "unknown"),
                    "degree": deg,
                    "in_degree": G.in_degree(node_id) if hasattr(G, "in_degree") else deg,
                    "out_degree": G.out_degree(node_id) if hasattr(G, "out_degree") else deg,
                    "pagerank": round(pagerank_dict.get(node_id, 0.0), 4),
                    "source_file": data.get("source_file"),
                    "source_location": data.get("source_location"),
                }
            )
            if len(results) >= top_n:
                break

        return results

    @staticmethod
    def compute_blast_radius(
        G: nx.DiGraph, seed_id_or_query: str, max_depth: int = 3, relations: set[str] | None = None
    ) -> list[AffectedNodeHit]:
        """Calculates upstream callers and downstream dependencies up to max_depth."""
        if seed_id_or_query not in G:
            # Fuzzy match on label or source_file
            matched = [
                n
                for n in G.nodes
                if seed_id_or_query.lower() in n.lower()
                or seed_id_or_query.lower() in G.nodes[n].get("label", "").lower()
            ]
            if not matched:
                return []
            seed_id = matched[0]
        else:
            seed_id = seed_id_or_query

        visited: set[str] = {seed_id}
        queue: list[tuple[str, int, str]] = [(seed_id, 0, "root")]
        hits: list[AffectedNodeHit] = []

        while queue:
            current, depth, rel = queue.pop(0)
            if depth > 0:
                data = G.nodes.get(current, {})
                hits.append(
                    AffectedNodeHit(
                        node_id=current,
                        label=data.get("label", current),
                        depth=depth,
                        via_relation=rel,
                        source_file=data.get("source_file"),
                        source_location=data.get("source_location"),
                    )
                )

            if depth >= max_depth:
                continue

            # Check incoming edges (upstream dependencies / callers)
            if hasattr(G, "predecessors"):
                for pred in G.predecessors(current):
                    if pred not in visited:
                        edge_data = G.get_edge_data(pred, current) or {}
                        edge_rel = edge_data.get("relation", "calls")
                        if relations is None or edge_rel in relations:
                            visited.add(pred)
                            queue.append((pred, depth + 1, f"called_by:{edge_rel}"))

            # Check outgoing edges (downstream dependencies)
            if hasattr(G, "successors"):
                for succ in G.successors(current):
                    if succ not in visited:
                        edge_data = G.get_edge_data(current, succ) or {}
                        edge_rel = edge_data.get("relation", "depends_on")
                        if relations is None or edge_rel in relations:
                            visited.add(succ)
                            queue.append((succ, depth + 1, f"depends_on:{edge_rel}"))

        return sorted(hits, key=lambda h: (h.depth, h.label))

    @staticmethod
    def analyze_graph(G: nx.DiGraph) -> GraphAnalyticsResult:
        """Comprehensive graph diagnostics and architecture metrics."""
        undirected = G.to_undirected()
        communities_map = GraphAnalyticsEngine.cluster_communities(G)
        community_labels = GraphAnalyticsEngine.label_communities_by_hub(G, communities_map)

        communities_data: dict[int, dict[str, Any]] = {}
        for cid, members in communities_map.items():
            sub = undirected.subgraph(members)
            cohesion = nx.density(sub) if len(members) > 1 else 1.0
            communities_data[cid] = {
                "id": cid,
                "label": community_labels.get(cid, f"Cluster {cid}"),
                "size": len(members),
                "cohesion": round(cohesion, 3),
                "top_members": members[:10],
            }

        # Circular dependencies (Strongly Connected Components > 1)
        circular_deps: list[list[str]] = []
        if G.is_directed():
            for scc in nx.strongly_connected_components(G):
                if len(scc) > 1:
                    circular_deps.append(sorted(list(scc)))

        # Bridge nodes / Cut vertices (Single points of failure in undirected graph)
        bridge_nodes = list(nx.articulation_points(undirected)) if len(undirected) > 2 else []

        # Isolated nodes (degree == 0)
        isolated_nodes = [n for n in G.nodes if G.degree(n) == 0]

        return GraphAnalyticsResult(
            total_nodes=G.number_of_nodes(),
            total_edges=G.number_of_edges(),
            density=round(nx.density(G), 4) if len(G) > 0 else 0.0,
            communities_count=len(communities_map),
            communities=communities_data,
            god_nodes=GraphAnalyticsEngine.find_god_nodes(G, top_n=10),
            circular_dependencies=circular_deps,
            bridge_nodes=bridge_nodes[:20],
            isolated_nodes=isolated_nodes[:20],
        )


class GraphWikiGenerator:
    """Generates Wikipedia-style Markdown documentation from a knowledge graph."""

    @staticmethod
    def generate_wiki(G: nx.DiGraph, out_dir: str | None = None) -> dict[str, str]:
        analytics = GraphAnalyticsEngine.analyze_graph(G)
        communities_map = GraphAnalyticsEngine.cluster_communities(G)
        community_labels = GraphAnalyticsEngine.label_communities_by_hub(G, communities_map)

        articles: dict[str, str] = {}

        # 1. INDEX.md Overview
        index_lines = [
            "# Architecture & Knowledge Graph Wiki",
            "",
            "> Automated system architecture documentation synthesized from codebase knowledge graphs.",
            "",
            "## System Metrics",
            f"- **Total Semantic Entities**: {analytics.total_nodes}",
            f"- **Architectural Relationships**: {analytics.total_edges}",
            f"- **Functional Clusters**: {analytics.communities_count}",
            f"- **Graph Density**: {analytics.density}",
            "",
            "## Architectural Keystones (God Nodes)",
            "",
        ]

        for gn in analytics.god_nodes:
            index_lines.append(
                f"- **`{gn['label']}`** ({gn['type']}) — Degree: {gn['degree']}, PageRank: {gn['pagerank']} in `{gn.get('source_file') or 'global'}`"
            )

        index_lines.extend(["", "## Functional Subsystems (Communities)", ""])
        for cid, comm in analytics.communities.items():
            slug = GraphWikiGenerator._slugify(comm["label"])
            index_lines.append(
                f"- [{comm['label']}]({slug}.md) — {comm['size']} components (Cohesion: {comm['cohesion']})"
            )

        articles["INDEX.md"] = "\n".join(index_lines)

        # 2. Per-Community Articles
        for cid, members in communities_map.items():
            label = community_labels.get(cid, f"Cluster {cid}")
            slug = GraphWikiGenerator._slugify(label)

            top_members = sorted(members, key=lambda n: G.degree(n) if n in G else 0, reverse=True)[:25]
            comm_lines = [
                f"# {label}",
                "",
                f"> Community {cid} · {len(members)} components",
                "",
                "## Key Components",
                "",
            ]

            for nid in top_members:
                nd = G.nodes.get(nid, {})
                nlabel = nd.get("label", nid)
                ntype = nd.get("type", "node")
                src = nd.get("source_file", "")
                loc = nd.get("source_location", "")
                doc = nd.get("docstring")
                loc_str = f"`{src}:{loc}`" if src and loc else (f"`{src}`" if src else "")

                comm_lines.append(f"### `{nlabel}` ({ntype})")
                if loc_str:
                    comm_lines.append(f"Location: {loc_str}")
                if doc:
                    comm_lines.append(f"\n{doc.strip()}\n")

                # Neighbors / Calls
                neighbors = list(G.neighbors(nid)) if nid in G else []
                if neighbors:
                    neighbor_links = [f"`{G.nodes[nb].get('label', nb)}`" for nb in neighbors[:5] if nb in G]
                    comm_lines.append(f"- **Connects to**: {', '.join(neighbor_links)}")
                comm_lines.append("")

            articles[f"{slug}.md"] = "\n".join(comm_lines)

        # Optionally save to disk
        if out_dir:
            out_path = Path(out_dir)
            out_path.mkdir(parents=True, exist_ok=True)
            for filename, content in articles.items():
                (out_path / filename).write_text(content, encoding="utf-8")

        return articles

    @staticmethod
    def _slugify(text: str) -> str:
        s = re.sub(r"[^\w\s-]", "", text).strip().lower()
        return re.sub(r"[-\s]+", "_", s) or "article"


# Singleton instances
graph_extractor = CodebaseGraphExtractor()
graph_analytics = GraphAnalyticsEngine()
graph_wiki_gen = GraphWikiGenerator()
