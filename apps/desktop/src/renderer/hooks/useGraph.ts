import { useQuery } from '@tanstack/react-query';
import { useNotes } from './useNotes';

export interface GraphNode {
  id: string;
  name: string;
  type: 'note' | 'tag';
  val?: number;
}

export interface GraphLink {
  source: string;
  target: string;
  type?: string;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://127.0.0.1:8000';

const fetchGraphData = async (): Promise<GraphData> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/graph`, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      if (data && Array.isArray(data.nodes)) {
        return {
          nodes: data.nodes,
          links: data.links || data.edges || [],
        };
      }
    }
  } catch (err) {
    console.warn('Backend graph API unreachable, synthesizing local graph:', err);
  }

  // Return empty data if fetch fails; useGraph will fallback to local notes
  return { nodes: [], links: [] };
};

export function useGraph() {
  const { data: notes } = useNotes();

  return useQuery({
    queryKey: ['graph', notes?.length],
    queryFn: async (): Promise<GraphData> => {
      // 1. Attempt to fetch from backend
      const backendGraph = await fetchGraphData();
      if (backendGraph.nodes && backendGraph.nodes.length > 0) {
        return backendGraph;
      }

      // 2. Synthesize from current local notes if backend has no nodes or is offline
      const nodes: GraphNode[] = [];
      const links: GraphLink[] = [];
      const seenNodeIds = new Set<string>();

      if (!notes || notes.length === 0) {
        return { nodes: [], links: [] };
      }

      // Add note nodes
      notes.forEach((note) => {
        if (!seenNodeIds.has(note.id)) {
          nodes.push({
            id: note.id,
            name: note.title || 'Untitled Note',
            type: 'note',
            val: 6,
          });
          seenNodeIds.add(note.id);
        }
      });

      // Parse [[wikilinks]] and tags
      const noteTitleMap = new Map<string, string>();
      notes.forEach((n) => noteTitleMap.set(n.title.toLowerCase().trim(), n.id));

      notes.forEach((note) => {
        // Parse wikilinks
        const wikiRegex = /\[\[(.*?)\]\]/g;
        let match;
        while ((match = wikiRegex.exec(note.content)) !== null) {
          const targetTitle = match[1].trim().toLowerCase();
          const targetId = noteTitleMap.get(targetTitle);
          if (targetId && targetId !== note.id) {
            links.push({
              source: note.id,
              target: targetId,
              type: 'link',
            });
          }
        }

        // Parse tags
        if (note.tags && Array.isArray(note.tags)) {
          note.tags.forEach((tag) => {
            const cleanTag = tag.trim().replace(/^#/, '');
            if (!cleanTag) return;
            const tagNodeId = `tag-${cleanTag.toLowerCase()}`;
            if (!seenNodeIds.has(tagNodeId)) {
              nodes.push({
                id: tagNodeId,
                name: `#${cleanTag}`,
                type: 'tag',
                val: 4,
              });
              seenNodeIds.add(tagNodeId);
            }
            links.push({
              source: note.id,
              target: tagNodeId,
              type: 'tag',
            });
          });
        }
      });

      return { nodes, links };
    },
    staleTime: 5000,
  });
}

