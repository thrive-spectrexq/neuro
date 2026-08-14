from __future__ import annotations

from collections import defaultdict, deque
from typing import Any

from pydantic import BaseModel, Field

from app.core.exceptions import RoadmapGenerationError
from app.core.logging import get_logger

logger = get_logger("roadmap_service")


class RoadmapNode(BaseModel):
    id: str
    title: str
    description: str
    difficulty: str = Field(default="intermediate", description="beginner, intermediate, advanced")
    estimated_hours: int = Field(default=4)
    status: str = Field(default="not_started", description="not_started, in_progress, completed")
    zone: str = Field(default="Core", description="Foundations, Core, Specialization, Advanced")
    resources: list[str] = Field(default_factory=list)
    key_takeaways: list[str] = Field(default_factory=list)


class RoadmapEdge(BaseModel):
    source: str
    target: str
    type: str = Field(default="requires", description="requires (source is prerequisite for target), relates_to")


class QuizQuestion(BaseModel):
    question: str
    options: list[str]
    correct_index: int
    explanation: str


class TopicQuiz(BaseModel):
    topic_id: str
    topic_title: str
    questions: list[QuizQuestion]


class RoadmapGraph(BaseModel):
    subject: str
    description: str
    total_estimated_hours: int
    nodes: list[RoadmapNode]
    edges: list[RoadmapEdge]
    zones: list[str]
    critical_path: list[str] = Field(default_factory=list)


class PrerequisitePathResult(BaseModel):
    target_id: str
    target_title: str
    prerequisites: list[dict[str, Any]]
    unlocked_topics: list[dict[str, Any]]
    prerequisite_depth: int
    is_ready_to_learn: bool


# Deterministic curated learning templates for instant zero-latency offline generation
CURATED_ROADMAP_TEMPLATES: dict[str, dict[str, Any]] = {
    "rust": {
        "subject": "Rust Systems Programming & Async",
        "description": "Comprehensive roadmap from memory safety fundamentals to high-performance async concurrency.",
        "zones": ["Foundations", "Memory & Ownership", "Advanced Types", "Async & Systems"],
        "nodes": [
            {
                "id": "rust-syntax",
                "title": "Syntax, Cargo & Tooling",
                "description": "Basic types, control flow, functions, cargo workspaces, and rustfmt.",
                "difficulty": "beginner",
                "estimated_hours": 3,
                "zone": "Foundations",
                "resources": ["The Rust Programming Language Ch 1-3", "Rustlings exercises 00-06"],
                "key_takeaways": ["Variables & mutability", "Basic scalar/compound types", "Cargo project layout"],
            },
            {
                "id": "ownership-borrowing",
                "title": "Ownership, Borrowing & Lifetimes",
                "description": "The borrow checker, heap vs stack allocations, references, and lifetime annotations.",
                "difficulty": "beginner",
                "estimated_hours": 6,
                "zone": "Memory & Ownership",
                "resources": ["Rust Book Ch 4 & 10", "Rust Nomicon - Ownership"],
                "key_takeaways": ["Single owner rule", "Exclusive mutable references", "Lifetime elision"],
            },
            {
                "id": "structs-enums-traits",
                "title": "Structs, Enums & Traits",
                "description": "Algebraic data types, pattern matching with Option/Result, trait definitions, and generics.",
                "difficulty": "intermediate",
                "estimated_hours": 5,
                "zone": "Advanced Types",
                "resources": ["Rust by Example - Traits", "Effective Rust by David Drysdale"],
                "key_takeaways": [
                    "Exhaustive match expressions",
                    "Custom derive macros",
                    "Dynamic dispatch vs monomorphization",
                ],
            },
            {
                "id": "smart-pointers",
                "title": "Smart Pointers & Interior Mutability",
                "description": "Box, Rc, Arc, RefCell, Mutex, and building custom data structures with safe interior mutability.",
                "difficulty": "intermediate",
                "estimated_hours": 6,
                "zone": "Memory & Ownership",
                "resources": ["Rust Book Ch 15", "Too Many Linked Lists"],
                "key_takeaways": [
                    "Shared ownership with Arc",
                    "Runtime borrow checking with RefCell",
                    "Thread safety bounds (Send/Sync)",
                ],
            },
            {
                "id": "async-tokio",
                "title": "Async Rust & Tokio Runtime",
                "description": "Futures, async/await syntax, pin projections, Tokio task spawning, channels, and select macro.",
                "difficulty": "advanced",
                "estimated_hours": 8,
                "zone": "Async & Systems",
                "resources": ["Async Book (rust-lang)", "Tokio Tutorial (tokio.rs)"],
                "key_takeaways": [
                    "Zero-cost state machine futures",
                    "Task cooperative multitasking",
                    "MPSC/Broadcast channels",
                ],
            },
            {
                "id": "systems-ffi",
                "title": "Systems Programming & FFI",
                "description": "Unsafe Rust, C ABI interop, memory mapped I/O, SIMD intrinsics, and kernel interfacing.",
                "difficulty": "advanced",
                "estimated_hours": 10,
                "zone": "Async & Systems",
                "resources": ["Rust Nomicon", "Writing an OS in Rust (Philipp Oppermann)"],
                "key_takeaways": [
                    "Unsafe invariants & raw pointers",
                    "extern C bindings",
                    "Embedded hardware interaction",
                ],
            },
        ],
        "edges": [
            {"source": "rust-syntax", "target": "ownership-borrowing", "type": "requires"},
            {"source": "ownership-borrowing", "target": "structs-enums-traits", "type": "requires"},
            {"source": "structs-enums-traits", "target": "smart-pointers", "type": "requires"},
            {"source": "smart-pointers", "target": "async-tokio", "type": "requires"},
            {"source": "smart-pointers", "target": "systems-ffi", "type": "requires"},
            {"source": "async-tokio", "target": "systems-ffi", "type": "relates_to"},
        ],
    },
    "machine-learning": {
        "subject": "Deep Learning & Modern AI Architectures",
        "description": "Complete pathway from linear algebra and gradient descent to Transformers and RAG systems.",
        "zones": ["Mathematical Foundations", "Classical ML", "Deep Neural Networks", "Transformers & LLMs"],
        "nodes": [
            {
                "id": "linear-algebra-calculus",
                "title": "Linear Algebra & Vector Calculus",
                "description": "Matrix operations, eigenvalues, partial derivatives, gradients, and the chain rule.",
                "difficulty": "beginner",
                "estimated_hours": 6,
                "zone": "Mathematical Foundations",
                "resources": [
                    "3Blue1Brown Essence of Linear Algebra",
                    "Matrix Calculus for Deep Learning (Parr & Howard)",
                ],
                "key_takeaways": [
                    "Matrix multiplication & dot products",
                    "Jacobians & Hessians",
                    "Chain rule vectorization",
                ],
            },
            {
                "id": "classical-ml",
                "title": "Classical Machine Learning",
                "description": "Linear/logistic regression, decision trees, SVMs, regularization (L1/L2), and loss functions.",
                "difficulty": "beginner",
                "estimated_hours": 8,
                "zone": "Classical ML",
                "resources": ["Scikit-Learn User Guide", "Andrew Ng Machine Learning Specialization"],
                "key_takeaways": [
                    "Gradient descent optimization",
                    "Cross-validation & bias-variance tradeoff",
                    "Precision/Recall/F1 metrics",
                ],
            },
            {
                "id": "neural-networks-backprop",
                "title": "Deep Neural Networks & Backpropagation",
                "description": "Multi-layer perceptrons, activation functions (ReLU, GELU), computational graphs, and automatic differentiation.",
                "difficulty": "intermediate",
                "estimated_hours": 8,
                "zone": "Deep Neural Networks",
                "resources": ["Deep Learning Book (Goodfellow et al.)", "PyTorch Blitz Tutorial"],
                "key_takeaways": [
                    "Backprop computational graphs",
                    "Vanishing/exploding gradients",
                    "Optimizers: AdamW, RMSProp",
                ],
            },
            {
                "id": "cnns-and-embeddings",
                "title": "Vector Embeddings & Representation Learning",
                "description": "High-dimensional latent spaces, cosine similarity, contrastive loss, Word2Vec, and ChromaDB vector indexing.",
                "difficulty": "intermediate",
                "estimated_hours": 6,
                "zone": "Deep Neural Networks",
                "resources": ["Sentence-Transformers documentation", "Pinecone Vector Search Handbook"],
                "key_takeaways": [
                    "Dense vector representations",
                    "Approximate Nearest Neighbors (HNSW)",
                    "Semantic similarity search",
                ],
            },
            {
                "id": "transformers-attention",
                "title": "Transformer Architecture & Self-Attention",
                "description": "Scaled dot-product attention, multi-head attention, positional encodings, decoder-only architectures.",
                "difficulty": "advanced",
                "estimated_hours": 10,
                "zone": "Transformers & LLMs",
                "resources": [
                    "Attention Is All You Need (Vaswani et al.)",
                    "The Illustrated Transformer (Jay Alammar)",
                ],
                "key_takeaways": [
                    "Query-Key-Value projection matrices",
                    "Causal masking in auto-regressive models",
                    "Feed-forward expansion",
                ],
            },
            {
                "id": "rag-and-agents",
                "title": "Retrieval-Augmented Generation & AI Agents",
                "description": "Chunking strategies, hybrid BM25 + vector search, tool calling, re-ranking, and reasoning loops.",
                "difficulty": "advanced",
                "estimated_hours": 10,
                "zone": "Transformers & LLMs",
                "resources": [
                    "LangChain / LlamaIndex Architecture Guides",
                    "ReAct: Synergizing Reasoning and Acting in LLMs",
                ],
                "key_takeaways": [
                    "Context window optimization",
                    "Structured function/tool schema calling",
                    "Hallucination mitigation via retrieval",
                ],
            },
        ],
        "edges": [
            {"source": "linear-algebra-calculus", "target": "classical-ml", "type": "requires"},
            {"source": "classical-ml", "target": "neural-networks-backprop", "type": "requires"},
            {"source": "neural-networks-backprop", "target": "cnns-and-embeddings", "type": "requires"},
            {"source": "neural-networks-backprop", "target": "transformers-attention", "type": "requires"},
            {"source": "cnns-and-embeddings", "target": "rag-and-agents", "type": "requires"},
            {"source": "transformers-attention", "target": "rag-and-agents", "type": "requires"},
        ],
    },
    "distributed-systems": {
        "subject": "Distributed Systems & Cloud Architecture",
        "description": "From networking fundamentals and RPCs to consensus algorithms (Raft), event streaming, and fault tolerance.",
        "zones": ["Networking & IPC", "Storage & Concurrency", "Consensus & Coordination", "Cloud Scale"],
        "nodes": [
            {
                "id": "tcp-grpc-rpc",
                "title": "Networking Protocols, gRPC & Protobuf",
                "description": "TCP socket mechanics, HTTP/2 multiplexing, Protocol Buffers schema compilation, and bidirectional streaming.",
                "difficulty": "beginner",
                "estimated_hours": 5,
                "zone": "Networking & IPC",
                "resources": ["Designing Data-Intensive Applications Ch 4", "gRPC Core Concepts Guide"],
                "key_takeaways": [
                    "Binary serialization vs JSON",
                    "Streaming RPC lifecycles",
                    "Connection pooling & timeouts",
                ],
            },
            {
                "id": "cap-pacelc-consistency",
                "title": "CAP Theorem & Consistency Models",
                "description": "Linearizability, sequential consistency, eventual consistency, PACELC theorem, and vector clocks.",
                "difficulty": "intermediate",
                "estimated_hours": 6,
                "zone": "Storage & Concurrency",
                "resources": [
                    "Designing Data-Intensive Applications Ch 7-9",
                    "Martin Kleppmann Distributed Systems Course",
                ],
                "key_takeaways": [
                    "Partition tolerance realities",
                    "Strong vs eventual consistency trade-offs",
                    "Causal ordering with vector clocks",
                ],
            },
            {
                "id": "raft-consensus",
                "title": "Raft Consensus & Distributed State Machines",
                "description": "Leader election, log replication, safety invariants, joint consensus cluster membership changes, and snapshotting.",
                "difficulty": "advanced",
                "estimated_hours": 10,
                "zone": "Consensus & Coordination",
                "resources": [
                    "In Search of an Understandable Consensus Algorithm (Ongaro & Ousterhout)",
                    "The Secret Lives of Data (Raft visualization)",
                ],
                "key_takeaways": [
                    "Heartbeats & randomized election timeouts",
                    "Committed index progression",
                    "Byzantine vs crash-fault models",
                ],
            },
            {
                "id": "event-streaming-kafka",
                "title": "Event Streaming & Distributed Logs (Kafka)",
                "description": "Partitioning strategies, consumer groups, offset commits, exactly-once processing semantics, and log compaction.",
                "difficulty": "intermediate",
                "estimated_hours": 7,
                "zone": "Storage & Concurrency",
                "resources": ["Kafka: The Definitive Guide", "Building Event-Driven Microservices"],
                "key_takeaways": [
                    "Append-only partition logs",
                    "Consumer group rebalancing",
                    "Idempotent producer semantics",
                ],
            },
            {
                "id": "distributed-caching-sharding",
                "title": "Consistent Hashing & Distributed Caching",
                "description": "Consistent hashing rings with virtual nodes, cache invalidation patterns (Write-through, Cache-aside), and Redis clustering.",
                "difficulty": "advanced",
                "estimated_hours": 6,
                "zone": "Cloud Scale",
                "resources": ["Dynamo: Amazon's Highly Available Key-value Store", "Redis Cluster Specification"],
                "key_takeaways": [
                    "Minimal key reassignment on topology changes",
                    "Thundering herd mitigation",
                    "Two-phase commit vs Saga pattern",
                ],
            },
        ],
        "edges": [
            {"source": "tcp-grpc-rpc", "target": "cap-pacelc-consistency", "type": "requires"},
            {"source": "cap-pacelc-consistency", "target": "raft-consensus", "type": "requires"},
            {"source": "cap-pacelc-consistency", "target": "event-streaming-kafka", "type": "requires"},
            {"source": "event-streaming-kafka", "target": "distributed-caching-sharding", "type": "relates_to"},
            {"source": "raft-consensus", "target": "distributed-caching-sharding", "type": "requires"},
        ],
    },
}


class RoadmapService:
    @staticmethod
    def generate_roadmap(goal: str, depth: str = "intermediate") -> RoadmapGraph:
        """
        Synthesizes a structured dependency graph for a learning goal.
        Matches curated domain models for high-demand topics or generates dynamic DAG.
        """
        cleaned_goal = (goal or "").strip()
        if not cleaned_goal:
            raise RoadmapGenerationError(detail="Goal cannot be empty.")
        if len(cleaned_goal) > 200:
            raise RoadmapGenerationError(detail="Goal exceeds maximum allowed length of 200 characters.")

        normalized_depth = depth.lower().strip() if depth else "intermediate"
        if normalized_depth not in {"beginner", "intermediate", "advanced"}:
            raise RoadmapGenerationError(detail=f"Invalid depth '{depth}'. Must be beginner, intermediate, or advanced.")

        logger.info(f"Generating roadmap for goal: '{cleaned_goal}' (depth: {normalized_depth})")
        goal_lower = cleaned_goal.lower()

        # Check curated domains
        for key, template in CURATED_ROADMAP_TEMPLATES.items():
            if (
                key in goal_lower
                or (key == "rust" and ("rust" in goal_lower or "cargo" in goal_lower))
                or (
                    key == "machine-learning"
                    and (
                        "machine learning" in goal_lower
                        or "ai" in goal_lower
                        or "deep learning" in goal_lower
                        or "rag" in goal_lower
                        or "llm" in goal_lower
                        or "python" in goal_lower
                    )
                )
                or (
                    key == "distributed-systems"
                    and (
                        "distributed" in goal_lower
                        or "cloud" in goal_lower
                        or "microservice" in goal_lower
                        or "backend" in goal_lower
                        or "kafka" in goal_lower
                        or "grpc" in goal_lower
                    )
                )
            ):
                nodes = [RoadmapNode(**n) for n in template["nodes"]]
                edges = [RoadmapEdge(**e) for e in template["edges"]]
                total_hours = sum(n.estimated_hours for n in nodes)
                critical_path = RoadmapService._compute_critical_path(nodes, edges)
                return RoadmapGraph(
                    subject=template["subject"],
                    description=template["description"],
                    total_estimated_hours=total_hours,
                    nodes=nodes,
                    edges=edges,
                    zones=template["zones"],
                    critical_path=critical_path,
                )

        # Dynamic synthesis for general goals
        clean_goal = goal.strip().title()
        zones = ["Foundations", "Core Principles", "Practical Application", "Advanced Mastery"]

        nodes = [
            RoadmapNode(
                id=f"{clean_goal.lower().replace(' ', '-')}-foundations",
                title=f"{clean_goal} Foundations",
                description=f"Core definitions, environment setup, and fundamental concepts of {clean_goal}.",
                difficulty="beginner",
                estimated_hours=4,
                zone="Foundations",
                resources=[f"Official {clean_goal} Documentation", "Getting Started Guide"],
                key_takeaways=["Core terminology", "Environment verification", "Hello World baseline"],
            ),
            RoadmapNode(
                id=f"{clean_goal.lower().replace(' ', '-')}-core-architecture",
                title=f"{clean_goal} Architecture & Mechanics",
                description=f"Deep dive into the underlying architecture and patterns of {clean_goal}.",
                difficulty="intermediate",
                estimated_hours=6,
                zone="Core Principles",
                resources=[f"{clean_goal} Architecture Specification", "Best Practices Whitepaper"],
                key_takeaways=["Component lifecycle", "Data structures & invariants", "Error handling paradigms"],
            ),
            RoadmapNode(
                id=f"{clean_goal.lower().replace(' ', '-')}-implementation-projects",
                title=f"Hands-on {clean_goal} Implementation",
                description=f"Building real-world projects, integration testing, and performance profiling in {clean_goal}.",
                difficulty="intermediate",
                estimated_hours=8,
                zone="Practical Application",
                resources=[f"Practical {clean_goal} Repository Examples", "End-to-End Test Suite"],
                key_takeaways=["Modular project scaffolding", "Unit & Integration test suites", "Debugging workflows"],
            ),
            RoadmapNode(
                id=f"{clean_goal.lower().replace(' ', '-')}-advanced-optimization",
                title=f"Advanced {clean_goal} & Production Scaling",
                description=f"Security hardening, production deployment, optimization, and system resilience for {clean_goal}.",
                difficulty="advanced",
                estimated_hours=10,
                zone="Advanced Mastery",
                resources=[f"High-Scale {clean_goal} Case Studies", "Performance Tuning Reference"],
                key_takeaways=["Latency & throughput optimization", "Security verification", "Production monitoring"],
            ),
        ]

        edges = [
            RoadmapEdge(source=nodes[0].id, target=nodes[1].id, type="requires"),
            RoadmapEdge(source=nodes[1].id, target=nodes[2].id, type="requires"),
            RoadmapEdge(source=nodes[2].id, target=nodes[3].id, type="requires"),
        ]

        critical_path = [n.id for n in nodes]
        total_hours = sum(n.estimated_hours for n in nodes)

        return RoadmapGraph(
            subject=f"{clean_goal} Mastery Map",
            description=f"Structured progressive learning pathway to master {clean_goal} with verified dependency progression.",
            total_estimated_hours=total_hours,
            nodes=nodes,
            edges=edges,
            zones=zones,
            critical_path=critical_path,
        )

    @staticmethod
    def get_prerequisite_path(
        target_id: str, nodes: list[dict[str, Any]], edges: list[dict[str, Any]]
    ) -> PrerequisitePathResult:
        """
        Calculates the complete prerequisite ancestor tree and downstream unlocked topics for a specific node.
        """
        node_map = {str(n.get("id")): n for n in nodes}
        target_node = node_map.get(str(target_id), {"id": target_id, "title": target_id, "name": target_id})
        target_title = target_node.get("title") or target_node.get("name") or str(target_id)

        # Build adjacency maps
        # upstream: target -> sources (requires)
        # downstream: source -> targets (unlocked by)
        upstream_graph = defaultdict(list)
        downstream_graph = defaultdict(list)

        for edge in edges:
            src = str(edge.get("source", {}).get("id") if isinstance(edge.get("source"), dict) else edge.get("source"))
            dst = str(edge.get("target", {}).get("id") if isinstance(edge.get("target"), dict) else edge.get("target"))
            edge_type = edge.get("type", "requires")

            if edge_type in ("requires", "link"):
                upstream_graph[dst].append(src)
                downstream_graph[src].append(dst)

        # 1. Find all upstream prerequisites using BFS
        visited_prereqs = set()
        queue = deque([(str(target_id), 0)])
        max_depth = 0
        prereq_list = []

        while queue:
            curr_id, depth = queue.popleft()
            for parent_id in upstream_graph.get(curr_id, []):
                if parent_id not in visited_prereqs and parent_id != str(target_id):
                    visited_prereqs.add(parent_id)
                    parent_node = node_map.get(parent_id, {"id": parent_id, "title": parent_id, "name": parent_id})
                    p_title = parent_node.get("title") or parent_node.get("name") or parent_id
                    p_status = parent_node.get("status", "not_started")
                    prereq_list.append(
                        {
                            "id": parent_id,
                            "title": p_title,
                            "status": p_status,
                            "depth": depth + 1,
                            "zone": parent_node.get("zone", "Foundations"),
                        }
                    )
                    max_depth = max(max_depth, depth + 1)
                    queue.append((parent_id, depth + 1))

        # 2. Find all downstream unlocks using BFS
        visited_unlocks = set()
        queue = deque([str(target_id)])
        unlock_list = []

        while queue:
            curr_id = queue.popleft()
            for child_id in downstream_graph.get(curr_id, []):
                if child_id not in visited_unlocks and child_id != str(target_id):
                    visited_unlocks.add(child_id)
                    child_node = node_map.get(child_id, {"id": child_id, "title": child_id, "name": child_id})
                    c_title = child_node.get("title") or child_node.get("name") or child_id
                    unlock_list.append(
                        {
                            "id": child_id,
                            "title": c_title,
                            "status": child_node.get("status", "not_started"),
                            "zone": child_node.get("zone", "Advanced"),
                        }
                    )
                    queue.append(child_id)

        # Check if ready to learn (all direct prerequisites are completed or no prerequisites exist)
        direct_parents = upstream_graph.get(str(target_id), [])
        is_ready = True
        for p_id in direct_parents:
            p_status = node_map.get(p_id, {}).get("status", "not_started")
            if p_status != "completed":
                is_ready = False
                break

        return PrerequisitePathResult(
            target_id=str(target_id),
            target_title=target_title,
            prerequisites=prereq_list,
            unlocked_topics=unlock_list,
            prerequisite_depth=max_depth,
            is_ready_to_learn=is_ready,
        )

    @staticmethod
    def generate_topic_quiz(topic_id: str, topic_title: str) -> TopicQuiz:
        """
        Generates an interactive verification quiz to test mastery of a topic.
        """
        title_clean = topic_title.replace("#", "").strip()
        return TopicQuiz(
            topic_id=topic_id,
            topic_title=title_clean,
            questions=[
                QuizQuestion(
                    question=f"What is the primary foundation and core purpose of {title_clean}?",
                    options=[
                        f"Establishing deterministic invariants and foundational patterns in {title_clean}",
                        "Replacing standard compiler optimizations with runtime heuristics",
                        "Disabling type verification for performance benefits",
                        "Bypassing architectural separation of concerns",
                    ],
                    correct_index=0,
                    explanation=f"{title_clean} provides structured architectural guarantees and predictable execution flow.",
                ),
                QuizQuestion(
                    question=f"When implementing {title_clean}, which prerequisite pattern must be verified first?",
                    options=[
                        "Arbitrary memory allocation without bounds checking",
                        "Input validation, dependency integrity, and interface contracts",
                        "Suppressing all runtime exceptions silently",
                        "Hardcoding absolute local filesystem paths",
                    ],
                    correct_index=1,
                    explanation=f"Reliable implementations of {title_clean} require explicit contract verification and dependency integrity.",
                ),
                QuizQuestion(
                    question=f"What is the most effective way to validate mastery in {title_clean}?",
                    options=[
                        "Memorizing syntax without testing edge cases",
                        "Building end-to-end practical artifacts and validating failure cases",
                        "Ignoring benchmark metrics and resource constraints",
                        "Relying entirely on remote cloud APIs without offline fallbacks",
                    ],
                    correct_index=1,
                    explanation=f"True mastery of {title_clean} is verified through practical hands-on implementations and edge-case testing.",
                ),
            ],
        )

    @staticmethod
    def _compute_critical_path(nodes: list[RoadmapNode], edges: list[RoadmapEdge]) -> list[str]:
        """Calculates the longest path in the DAG."""
        adj = defaultdict(list)
        in_degree = defaultdict(int)
        for n in nodes:
            in_degree[n.id] = 0

        for edge in edges:
            if edge.type == "requires":
                adj[edge.source].append(edge.target)
                in_degree[edge.target] += 1

        # Topological sort
        zero_in = [n.id for n in nodes if in_degree[n.id] == 0]
        queue = deque(zero_in)
        dist = {n.id: n.estimated_hours for n in nodes}
        parent = {n.id: None for n in nodes}
        topo_order = []

        while queue:
            curr = queue.popleft()
            topo_order.append(curr)
            for neighbor in adj[curr]:
                neighbor_weight = next((n.estimated_hours for n in nodes if n.id == neighbor), 1)
                if dist[curr] + neighbor_weight > dist[neighbor]:
                    dist[neighbor] = dist[curr] + neighbor_weight
                    parent[neighbor] = curr
                in_degree[neighbor] -= 1
                if in_degree[neighbor] == 0:
                    queue.append(neighbor)

        if not dist:
            return [n.id for n in nodes]

        max_node = max(dist.keys(), key=lambda k: dist[k])
        path = []
        curr = max_node
        while curr:
            path.append(curr)
            curr = parent[curr]
        path.reverse()
        return path
